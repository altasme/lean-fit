-- Lean & Fit - territory level remap: Franchise moves to city-level
-- (was region-level), Distributor moves to barangay-level (was
-- city-level, now the same granularity as Reseller). Paste after 0015.
--
-- Client decisions:
--   1. A barangay can have an active Distributor AND an active Reseller
--      at the same time - they're independent roles, not competing for
--      one slot.
--   2. No limit on the number of Franchise, Distributor, or Reseller
--      partners at all - territory capacity is no longer enforced for
--      any partner type. resolve_and_reserve_territory()/
--      assign_partner_territory() still resolve/validate the territory
--      (level checks, lazy barangay creation), they just no longer reject
--      on a capacity ceiling. `territories.capacity` is left in the
--      schema (harmless, unused) rather than dropped, in case limits come
--      back later - nothing reads or enforces it anymore.
--
-- Deliberately NOT touched (client explicitly deferred this): the
-- sponsor/onboarding containment checks in onboard_partner() that used to
-- compare "the target territory's ancestor" against "the caller's own
-- territory_id" - those compared same-granularity ids under the old
-- mapping (Distributor's own territory was a city, Franchise's was a
-- region), which no longer holds now that Distributor's own territory is
-- a barangay and Franchise's is a city. Relaxed (removed) rather than
-- left silently broken (they would now always fail, since a barangay id
-- never equals a city id and vice versa) - a real "onboard only within
-- my own coverage area" containment model for the new levels is a
-- separate design task, not done here.

create or replace function resolve_and_reserve_territory(
  p_partner_type partner_type,
  p_input_territory_id uuid,
  p_barangay_name text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_input_level territory_level;
  v_final_id uuid;
begin
  select territories.level into v_input_level
  from territories where territories.id = p_input_territory_id;
  if v_input_level is null then
    raise exception 'Territory not found';
  end if;

  if p_partner_type = 'franchise' then
    if v_input_level <> 'city' then
      raise exception 'A Franchise must be assigned a city/municipality';
    end if;
    v_final_id := p_input_territory_id;
  else
    -- Distributor and Reseller are both barangay-level now, with no
    -- limit on how many of either can share a barangay.
    if v_input_level <> 'city' then
      raise exception 'Select the city/municipality the barangay belongs to';
    end if;
    if p_barangay_name is null or length(trim(p_barangay_name)) = 0 then
      raise exception 'Barangay is required for a % partner', p_partner_type;
    end if;
    v_final_id := find_or_create_barangay_territory(p_barangay_name, p_input_territory_id);
  end if;

  return v_final_id;
end;
$$;

-- ---------------------------------------------------------------------
-- onboard_partner(): unchanged level logic (it delegates to
-- resolve_and_reserve_territory() above, so that fix already covers it) -
-- only the now-mismatched containment checks are removed, per the note
-- at the top of this file.
-- ---------------------------------------------------------------------

create or replace function onboard_partner(
  p_full_name text,
  p_email text,
  p_mobile text,
  p_address text,
  p_partner_type partner_type,
  p_territory_id uuid,
  p_barangay_name text default null
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
  v_final_territory_id uuid;
  v_region_name text;
  v_city_name text;
  v_barangay_name text;
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

  v_final_territory_id := resolve_and_reserve_territory(p_partner_type, p_territory_id, p_barangay_name);

  select d.region_name, d.city_name, d.barangay_name
    into v_region_name, v_city_name, v_barangay_name
  from describe_territory_chain(v_final_territory_id) d;

  insert into partners (
    full_name, email, mobile, address, region, city, barangay,
    partner_type, territory_id, status, parent_partner_id, onboarded_by_partner_id
  ) values (
    p_full_name, p_email, p_mobile, p_address, v_region_name, v_city_name, v_barangay_name,
    p_partner_type, v_final_territory_id, 'pending', v_caller_partner_id, v_caller_partner_id
  )
  returning partners.id into v_new_partner_id;

  return query select v_new_partner_id, 'pending'::partner_status;
end;
$$;

grant execute on function onboard_partner to authenticated;

-- ---------------------------------------------------------------------
-- assign_partner_territory(): admin's direct territory reassignment
-- (currently unreachable - the admin UI section that called this was
-- removed per a later request, see AdminPartnerDetail.tsx history - kept
-- correct/consistent in case it's ever reinstated).
-- ---------------------------------------------------------------------

create or replace function assign_partner_territory(
  p_partner_id uuid,
  p_territory_id uuid
) returns table (partner_id uuid, territory_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_type partner_type;
  v_territory_level territory_level;
  v_region_name text;
  v_city_name text;
  v_barangay_name text;
begin
  if not is_admin() then
    raise exception 'Only admins can assign territories';
  end if;

  select partners.partner_type into v_partner_type from partners where partners.id = p_partner_id;
  if v_partner_type is null then
    raise exception 'Partner not found';
  end if;

  select territories.level into v_territory_level
  from territories where territories.id = p_territory_id;
  if v_territory_level is null then
    raise exception 'Territory not found';
  end if;

  if v_territory_level = 'city' then
    if v_partner_type <> 'franchise' then
      raise exception 'A % partner cannot be assigned to a city territory', v_partner_type;
    end if;
  elsif v_territory_level = 'barangay' then
    if v_partner_type not in ('distributor', 'reseller') then
      raise exception 'A % partner cannot be assigned to a barangay territory', v_partner_type;
    end if;
  else
    raise exception 'A % partner cannot be assigned to a % territory', v_partner_type, v_territory_level;
  end if;

  select d.region_name, d.city_name, d.barangay_name into v_region_name, v_city_name, v_barangay_name
  from describe_territory_chain(p_territory_id) d;

  update partners set
    territory_id = p_territory_id,
    region = v_region_name,
    city = v_city_name,
    barangay = v_barangay_name
  where partners.id = p_partner_id;

  return query select p_partner_id, p_territory_id;
end;
$$;

grant execute on function assign_partner_territory to authenticated;
