-- Lean & Fit - fixes two bugs in assign_partner_territory() (migration
-- 0010), both surfaced while auditing the admin panel after migration
-- 0012 added 'province' as a real (never partner-assignable) territories
-- level. Paste after 0012.
--
-- Bug 1 (confirmed by reproduction, not assumed): the function's
-- level->partner_type mapping was a `case ... when 'region' ... when
-- 'city' ... when 'barangay' ... end` with no `else`. That was exhaustive
-- before 0012 (territory_level only had those three values), so it never
-- mattered. Now that 'province' is a fourth value, the CASE falls through
-- to NULL for it, and `if v_expected_type <> v_partner_type` is NULL (not
-- true) when v_expected_type is NULL - so the "wrong level for this
-- partner type" guard silently PASSED instead of rejecting, and a
-- Franchise (or any partner type) could be assigned directly to a
-- province-level territory row. Fixed by rejecting explicitly whenever
-- the level has no valid partner type at all, not just when it mismatches
-- the wrong one.
--
-- Bug 2: the function only ever updated `partners.territory_id`, never
-- the human-readable `partners.region/city/barangay` columns the admin
-- panel actually displays (Partners list "Location" column, Partner
-- Detail "Applicant" section). Every admin-driven reassignment left those
-- three columns silently stale from whatever the partner's original
-- application territory was. apply_for_partner()/onboard_partner()
-- already derive these from describe_territory_chain() (migration 0012) -
-- this does the same on reassignment, so the admin panel's own displayed
-- location always matches the territory it just assigned.

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
  v_expected_type partner_type;
  v_capacity int;
  v_occupied int;
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

  select territories.level, territories.capacity into v_territory_level, v_capacity
  from territories where territories.id = p_territory_id;
  if v_territory_level is null then
    raise exception 'Territory not found';
  end if;

  v_expected_type := case v_territory_level
    when 'region' then 'franchise'
    when 'city' then 'distributor'
    when 'barangay' then 'reseller'
    else null
  end;

  if v_expected_type is null or v_expected_type <> v_partner_type then
    raise exception 'A % partner cannot be assigned to a % territory', v_partner_type, v_territory_level;
  end if;

  if v_capacity is not null then
    select count(*) into v_occupied
    from partners
    where partners.territory_id = p_territory_id
      and partners.status = 'active'
      and partners.id <> p_partner_id;

    if v_occupied >= v_capacity then
      raise exception 'This territory is at capacity (% / %)', v_occupied, v_capacity;
    end if;
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
