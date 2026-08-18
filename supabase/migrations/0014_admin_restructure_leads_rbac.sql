-- Lean & Fit - admin portal restructure: role-gated write access on
-- Products/Promotions/Partner Pricing (migration 0011 added admin_users.
-- role as inert groundwork - this is the actual enforcement), the public
-- "Become a Partner" form collapsed to a lead-capture form, and a new
-- admin-driven full manual partner creation path (type/territory/package/
-- payment, admin fills in everything after calling the lead back). Paste
-- after 0012/0013.

-- ---------------------------------------------------------------------
-- RBAC: is_full_admin() - role = 'admin' specifically, vs is_admin()
-- which is true for BOTH 'admin' and 'staff_admin' (any admin_users
-- member). Staff can still view/act on orders (is_admin() stays as-is
-- everywhere order-related) but Products/Promotions/Partner Pricing
-- writes now require the stronger check. Reading active products/
-- promotions is untouched - that's a separate public policy, not this
-- one - so staff isn't blocked from anything customer-facing either.
-- ---------------------------------------------------------------------

create or replace function is_full_admin() returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users where user_id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function is_full_admin to authenticated;

-- admin_users never stored email/full_name (nothing needed it before -
-- is_admin()/is_full_admin() only ever check user_id+role). Item #5's
-- User Management list needs something human-readable to show without a
-- service-role join against auth.users, so grant-portal-access (mode:
-- 'staff') writes these directly at account-creation time - same
-- redundant-copy pattern `partners` already uses instead of joining
-- auth.users. Nullable since existing rows (created before this) won't
-- have them backfilled.
alter table admin_users add column email text;
alter table admin_users add column full_name text;

alter policy "admin full access on products"
  on products using (is_full_admin()) with check (is_full_admin());

alter policy "admin full access on promotions"
  on promotions using (is_full_admin()) with check (is_full_admin());

alter policy "admin full access on partner_pricing_tiers"
  on partner_pricing_tiers using (is_full_admin()) with check (is_full_admin());

-- ---------------------------------------------------------------------
-- Public application collapses to a lead form (name/mobile/email/
-- province/city only - no partner type, no territory, no package/
-- payment). A lead is a real `partners` row from the moment it's
-- submitted (so it shows up in the admin Pending Partners list
-- immediately, sortable/searchable with everything else) but most
-- columns stay null until admin manually completes onboarding via
-- admin_create_partner() below after calling the lead back - hence
-- partner_type going nullable. territory_id was already nullable.
-- `province` is new: the lead's free-text/picked province, distinct
-- from `region`/`city`/`barangay` which stay null until a real
-- territory is actually assigned.
-- ---------------------------------------------------------------------

alter table partners alter column partner_type drop not null;
alter table partners add column province text;

drop function if exists apply_for_partner(text, text, text, text, partner_type, uuid, text);

create or replace function submit_partner_lead(
  p_full_name text,
  p_email text,
  p_mobile text,
  p_province text,
  p_city text
) returns table (partner_id uuid, status partner_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
begin
  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'Full name is required';
  end if;
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'Email is required';
  end if;
  if p_mobile is null or length(trim(p_mobile)) = 0 then
    raise exception 'Mobile number is required';
  end if;

  insert into partners (full_name, email, mobile, province, city, status)
  values (p_full_name, p_email, p_mobile, p_province, p_city, 'pending')
  returning partners.id into v_new_id;

  return query select v_new_id, 'pending'::partner_status;
end;
$$;

grant execute on function submit_partner_lead to anon, authenticated;

-- ---------------------------------------------------------------------
-- admin_create_partner() - the admin-side "Add Partner" form (item 2):
-- full manual onboarding after a phone call with a lead, or a fresh
-- partner with no prior lead at all. Not restricted to is_full_admin() -
-- the client's staff restriction list was specifically Products/
-- Promotions/Partner Pricing, partners weren't named, so this stays
-- open to any admin_users member like the rest of partner management
-- (approve/reject/suspend/reassign) already is. Reuses resolve_and_
-- reserve_territory() so admin-driven capacity enforcement is identical
-- to the applicant/onboarding paths - no special override for admins.
-- Territory/package/payment are all optional so admin can save a
-- partial record and finish later; p_activate skips straight to
-- 'active'/'paid' (the phone-sale-already-happened case) instead of the
-- normal pending -> admin-approves-separately two-step.
-- ---------------------------------------------------------------------

create or replace function admin_create_partner(
  p_full_name text,
  p_email text,
  p_mobile text,
  p_address text default null,
  p_partner_type partner_type default null,
  p_territory_id uuid default null,
  p_barangay_name text default null,
  p_package text default null,
  p_package_boxes int default null,
  p_package_amount numeric default null,
  p_payment_method payment_method default null,
  p_payment_reference text default null,
  p_payment_amount numeric default null,
  p_payment_date date default null,
  p_payment_proof_path text default null,
  p_activate boolean default false,
  -- When set, completes an EXISTING pending lead (submit_partner_lead())
  -- in place instead of inserting a new row - without this, onboarding a
  -- lead from the Pending tab would leave the original lead stuck
  -- pending forever while a second, fully-formed row also existed.
  p_existing_partner_id uuid default null
) returns table (partner_id uuid, status partner_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_final_territory_id uuid;
  v_region_name text;
  v_city_name text;
  v_barangay_name text;
  v_id uuid;
  v_referral_code text;
  v_status partner_status;
  v_payment_status payment_status;
  v_existing_status partner_status;
begin
  if not is_admin() then
    raise exception 'Only admins can manually add partners';
  end if;
  if p_activate and (p_partner_type is null or p_territory_id is null) then
    raise exception 'Partner type and territory are required to activate a partner';
  end if;

  if p_existing_partner_id is not null then
    select partners.status into v_existing_status from partners where partners.id = p_existing_partner_id;
    if v_existing_status is null then
      raise exception 'Partner not found';
    end if;
    if v_existing_status <> 'pending' then
      raise exception 'This partner has already been onboarded';
    end if;
  end if;

  if p_territory_id is not null then
    if p_partner_type is null then
      raise exception 'Partner type is required when a territory is set';
    end if;
    v_final_territory_id := resolve_and_reserve_territory(p_partner_type, p_territory_id, p_barangay_name);
    select d.region_name, d.city_name, d.barangay_name into v_region_name, v_city_name, v_barangay_name
    from describe_territory_chain(v_final_territory_id) d;
  end if;

  v_status := case when p_activate then 'active' else 'pending' end;
  v_payment_status := case when p_activate then 'paid' else 'pending_verification' end;
  if p_activate then
    v_referral_code := generate_referral_code(p_full_name);
  end if;

  if p_existing_partner_id is not null then
    update partners set
      full_name = p_full_name, email = p_email, mobile = p_mobile, address = p_address,
      region = v_region_name, city = v_city_name, barangay = v_barangay_name,
      partner_type = p_partner_type, territory_id = v_final_territory_id, status = v_status,
      package = p_package, package_boxes = p_package_boxes, package_amount = p_package_amount,
      payment_method = p_payment_method, payment_reference = p_payment_reference,
      payment_amount = p_payment_amount, payment_date = p_payment_date,
      payment_proof_path = p_payment_proof_path, payment_status = v_payment_status,
      referral_code = coalesce(v_referral_code, partners.referral_code),
      activated_at = case when p_activate then now() else partners.activated_at end
    where partners.id = p_existing_partner_id
    returning partners.id into v_id;
  else
    insert into partners (
      full_name, email, mobile, address, region, city, barangay,
      partner_type, territory_id, status,
      package, package_boxes, package_amount,
      payment_method, payment_reference, payment_amount, payment_date, payment_proof_path, payment_status,
      referral_code, activated_at
    ) values (
      p_full_name, p_email, p_mobile, p_address, v_region_name, v_city_name, v_barangay_name,
      p_partner_type, v_final_territory_id, v_status,
      p_package, p_package_boxes, p_package_amount,
      p_payment_method, p_payment_reference, p_payment_amount, p_payment_date, p_payment_proof_path, v_payment_status,
      v_referral_code, case when p_activate then now() else null end
    ) returning partners.id into v_id;
  end if;

  return query select v_id, v_status;
end;
$$;

grant execute on function admin_create_partner to authenticated;
