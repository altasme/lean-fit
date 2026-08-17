-- Lean & Fit - Reseller Portal Part 2: partner-assisted onboarding,
-- fulfillment method, Staff Admin groundwork. See
-- "Partner Onboarding, Dropshipping & Order Visibility Addendum"
-- (RESELLER_PORTAL_SPEC_PART2_ADDENDUM.md) §1-11, §25-31, §34.
--
-- Scope decision, documented in supabase/README.md: Part 2's "manual
-- partner-fulfilled order" concept (§12-18, §33) describes a sale that
-- never touches the Lean & Fit website at all - the partner transacts
-- with the customer directly, off-platform, and per §33 "partner-
-- fulfilled orders may be completely absent from the centralized order
-- system if that is the intended business process." No partner
-- inventory/manual-fulfillment UI is built anywhere in this app, so that
-- is exactly the path taken here: every order that reaches
-- create_order_with_payment() is, by construction, a Lean & Fit dropship
-- order (the only fulfillment path that exists). fulfillment_method is
-- added below for data-model honesty/future-proofing (spec's own
-- "recommended field," §33) with a fixed default - no UI toggle, since
-- there's no alternative to toggle to yet.

create type fulfillment_method as enum ('lean_and_fit_dropship', 'partner_fulfillment');

alter table orders add column fulfillment_method fulfillment_method not null default 'lean_and_fit_dropship';

-- ---------------------------------------------------------------------
-- Onboarding relationship (spec §8: "Onboarded By" - retained for audit
-- purposes independent of parent_partner_id, which Phase G's admin UI
-- can reassign later; onboarded_by_partner_id is the immutable historical
-- record of who actually sponsored/paid for this partner's activation).
-- ---------------------------------------------------------------------

alter table partners add column onboarded_by_partner_id uuid references partners(id);

-- ---------------------------------------------------------------------
-- Staff Admin groundwork (spec §6/§31/§34.5): "the exact Staff Admin
-- permission matrix will be defined in a future phase... the system
-- should support a role/permission architecture capable of restricting
-- Staff Admin access later. Do not hard-code every administrative
-- account as having identical privileges." This adds the column only -
-- no enforcement logic, no admin-user-management UI - since the matrix
-- itself is explicitly out of scope until that future phase. Every
-- existing/new admin_users row defaults to 'admin' (full access,
-- unchanged behavior); is_admin() is untouched.
-- ---------------------------------------------------------------------

create type admin_role as enum ('admin', 'staff_admin');
alter table admin_users add column role admin_role not null default 'admin';

-- ---------------------------------------------------------------------
-- list_territories_with_occupancy(): lets a partner's "Add Partner" form
-- show real capacity-aware territory options. Territories themselves are
-- already anon/authenticated-readable ("anyone can read territories",
-- migration 0004), but a partner can't compute occupancy client-side -
-- their `partners` RLS visibility (migration 0009) is scoped to their
-- own/referred/adjacent rows, not every partner in a candidate territory.
-- SECURITY DEFINER bypasses that for this one read-only, non-sensitive
-- count (a territory's occupied slot count isn't PII, same reasoning as
-- territories being public in the first place).
-- ---------------------------------------------------------------------

create or replace function list_territories_with_occupancy(p_level territory_level)
returns table (id uuid, name text, parent_id uuid, capacity int, occupied bigint)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.name, t.parent_id, t.capacity,
    (select count(*) from partners p where p.territory_id = t.id and p.status = 'active')
  from territories t
  where t.level = p_level
  order by t.name;
$$;

grant execute on function list_territories_with_occupancy to authenticated;

-- ---------------------------------------------------------------------
-- onboard_partner(): Route B from spec §1/§7-10 - an authorized partner
-- (Distributor or Franchise, not Reseller - §2-5) adds a new partner on
-- someone else's behalf. Creates a 'pending' application exactly like
-- apply_for_partner() (Route A, migration 0005), still gated on the same
-- admin approve_partner() review below - onboarding doesn't skip
-- Lean & Fit's verification/approval step (§9: "does not bypass Lean &
-- Fit payment processing"), it only changes who initiates it and adds
-- the checks this migration's comments walk through inline.
--
-- Deliberately NOT built: reusing the same insert path for Route A
-- (apply_for_partner stays exactly as-is, still free-text region/city/
-- barangay, no live territory picker - see Part 1's documented gap,
-- unchanged/parked). This function only serves the NEW Route B flow,
-- which is real functionality with a real territory picker from the
-- start since it didn't exist before.
-- ---------------------------------------------------------------------

create or replace function onboard_partner(
  p_full_name text,
  p_email text,
  p_mobile text,
  p_address text,
  p_partner_type partner_type,
  p_territory_id uuid
) returns table (partner_id uuid, status partner_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_partner_id uuid;
  v_caller_type partner_type;
  v_caller_status partner_status;
  v_caller_territory_id uuid;
  v_territory_level territory_level;
  v_territory_name text;
  v_territory_parent_id uuid;
  v_expected_type partner_type;
  v_capacity int;
  v_occupied int;
  v_region_name text;
  v_city_name text;
  v_barangay_name text;
  v_city_id uuid;
  v_region_id uuid;
  v_new_partner_id uuid;
begin
  select partners.id, partners.partner_type, partners.status, partners.territory_id
    into v_caller_partner_id, v_caller_type, v_caller_status, v_caller_territory_id
  from partners where partners.user_id = auth.uid();

  if v_caller_partner_id is null then
    raise exception 'Only a signed-in partner can onboard another partner';
  end if;
  if v_caller_status <> 'active' then
    raise exception 'Only an active partner can onboard another partner';
  end if;

  -- Onboarding permission matrix - spec §2-5/§30/§34.2-4.
  if v_caller_type = 'reseller' then
    raise exception 'Resellers cannot onboard other partners';
  elsif v_caller_type = 'distributor' and p_partner_type <> 'reseller' then
    raise exception 'Distributors can only onboard Resellers';
  elsif v_caller_type = 'franchise' and p_partner_type = 'franchise' then
    raise exception 'Franchises cannot onboard other Franchises';
  end if;

  if v_caller_territory_id is null then
    raise exception 'You must have an assigned territory before onboarding a partner';
  end if;

  select territories.level, territories.name, territories.parent_id, territories.capacity
    into v_territory_level, v_territory_name, v_territory_parent_id, v_capacity
  from territories where territories.id = p_territory_id;
  if v_territory_level is null then
    raise exception 'Territory not found';
  end if;

  v_expected_type := case v_territory_level
    when 'region' then 'franchise'
    when 'city' then 'distributor'
    when 'barangay' then 'reseller'
  end;
  if v_expected_type <> p_partner_type then
    raise exception 'A % partner cannot be assigned to a % territory', p_partner_type, v_territory_level;
  end if;

  -- Derive the free-text region/city/barangay display fields (same shape
  -- Route A already uses) AND, along the way, the territory's ancestor
  -- chain - needed next for the "appropriate territorial parent" check
  -- (spec §28: onboarding is confined to the sponsor's own coverage area,
  -- not any barangay/city anywhere).
  if v_territory_level = 'barangay' then
    v_barangay_name := v_territory_name;
    v_city_id := v_territory_parent_id;
    select territories.name, territories.parent_id into v_city_name, v_region_id
    from territories where territories.id = v_city_id;
    select territories.name into v_region_name from territories where territories.id = v_region_id;
  elsif v_territory_level = 'city' then
    v_city_name := v_territory_name;
    v_region_id := v_territory_parent_id;
    select territories.name into v_region_name from territories where territories.id = v_region_id;
  else
    v_region_name := v_territory_name;
  end if;

  if v_caller_type = 'distributor' and v_city_id <> v_caller_territory_id then
    raise exception 'You can only onboard a Reseller into a barangay within your own city';
  end if;
  if v_caller_type = 'franchise' and v_region_id <> v_caller_territory_id then
    raise exception 'You can only onboard a partner into a city or barangay within your own region';
  end if;

  if v_capacity is not null then
    select count(*) into v_occupied
    from partners
    where partners.territory_id = p_territory_id and partners.status = 'active';

    if v_occupied >= v_capacity then
      raise exception 'This territory is at capacity (% / %)', v_occupied, v_capacity;
    end if;
  end if;

  -- The sponsor becomes the new partner's parent in the hierarchy tree -
  -- spec §8's own example pairs "Onboarded By" with exactly this
  -- relationship, and it's the natural reading of §30's tree structure.
  insert into partners (
    full_name, email, mobile, address, region, city, barangay,
    partner_type, territory_id, status, parent_partner_id, onboarded_by_partner_id
  ) values (
    p_full_name, p_email, p_mobile, p_address, v_region_name, v_city_name, v_barangay_name,
    p_partner_type, p_territory_id, 'pending', v_caller_partner_id, v_caller_partner_id
  )
  returning partners.id into v_new_partner_id;

  return query select v_new_partner_id, 'pending'::partner_status;
end;
$$;

grant execute on function onboard_partner to authenticated;

-- ---------------------------------------------------------------------
-- approve_partner(): re-checks territory capacity before activating, now
-- that a partner row can arrive at approval with a territory_id already
-- set (onboard_partner() above sets it at submission time, unlike Route
-- A/admin-driven Phase G assignment which happens after activation). The
-- capacity was valid when onboard_partner() checked it, but time passes
-- between submission and admin review - someone else could have filled
-- the slot in the meantime. Same re-check pattern as Phase G's
-- reactivate_partner(). Only change from migration 0006's version: this
-- guard is added; the rest of the function is unchanged.
-- ---------------------------------------------------------------------

create or replace function approve_partner(p_partner_id uuid) returns table (
  partner_id uuid, referral_code text, status partner_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_referral_code text;
  v_territory_id uuid;
  v_capacity int;
  v_occupied int;
begin
  if not is_admin() then
    raise exception 'Only admins can approve partner applications';
  end if;

  select partners.full_name, partners.territory_id into v_full_name, v_territory_id
  from partners where partners.id = p_partner_id;
  if v_full_name is null then
    raise exception 'Partner not found';
  end if;

  if v_territory_id is not null then
    select territories.capacity into v_capacity from territories where territories.id = v_territory_id;
    if v_capacity is not null then
      select count(*) into v_occupied
      from partners
      where partners.territory_id = v_territory_id
        and partners.status = 'active'
        and partners.id <> p_partner_id;

      if v_occupied >= v_capacity then
        raise exception 'Cannot approve - the selected territory is now at capacity (% / %). Reassign a territory on this partner first.', v_occupied, v_capacity;
      end if;
    end if;
  end if;

  v_referral_code := generate_referral_code(v_full_name);

  update partners set status = 'active', activated_at = now(),
    referral_code = v_referral_code, payment_status = 'paid'
  where partners.id = p_partner_id;

  return query select p_partner_id, v_referral_code, 'active'::partner_status;
end;
$$;

grant execute on function approve_partner to authenticated;
