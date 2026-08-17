-- Lean & Fit - Reseller Portal Part 1, Phase G: admin partner + territory
-- management. See spec Part 1 §7-11, §18-19, §56-58. Paste after 0002-0009.
--
-- Territory CRUD itself (create/edit/delete regions/cities/barangays,
-- set capacity) needs no new RPC - admin already has full table access
-- via "admin full access on territories" (migration 0004's is_admin()
-- policy), same as every other admin CRUD screen (products, promotions)
-- uses direct table access, not RPCs. Only the two operations with a real
-- business invariant to enforce get RPCs, same reasoning as
-- approve_partner()/submit_partner_package_payment() in migration 0006:
--
--   - assign_partner_territory(): spec §7/§9's strict level<->partner_type
--     mapping (franchise/region, distributor/city, reseller/barangay -
--     already encoded client-side as TERRITORY_LEVEL_PARTNER_TYPE in
--     src/types/territory.ts, mirrored here) and §58's "system prevents
--     unauthorized over-allocation" capacity check.
--   - reactivate_partner(): re-checks that same capacity before undoing a
--     suspension, since another partner may have taken the territory
--     while this one was suspended.
--
-- Suspending a partner needs no RPC either - no invariant to violate by
-- setting status = 'suspended' (already an enum value from migration
-- 0004, just never wired to an admin action until now). A suspended
-- partner's territory_id is left in place but no longer counts toward
-- capacity below (only 'active' partners are counted), so suspending
-- frees the slot for reassignment without losing the record of where
-- they were.
--
-- NOT built here (deliberately out of Part 1 Phase G's scope): live
-- territory-availability checking during the PUBLIC application form
-- (spec §19) - applicants still submit free-text region/city/barangay
-- (Phase B) rather than picking from real `territories` rows with live
-- capacity; automatic "missing partner" upstream routing (spec §23-24)
-- when assigning parent_partner_id - admin picks a parent manually from
-- a filtered list of eligible partners client-side, not an automated
-- cascade. Both are real gaps, not silent ones - see supabase/README.md.

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
  end;

  if v_expected_type <> v_partner_type then
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

  update partners set territory_id = p_territory_id where partners.id = p_partner_id;

  return query select p_partner_id, p_territory_id;
end;
$$;

grant execute on function assign_partner_territory to authenticated;

create or replace function reactivate_partner(
  p_partner_id uuid
) returns table (partner_id uuid, status partner_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status partner_status;
  v_territory_id uuid;
  v_capacity int;
  v_occupied int;
begin
  if not is_admin() then
    raise exception 'Only admins can reactivate partners';
  end if;

  select partners.status, partners.territory_id into v_status, v_territory_id
  from partners where partners.id = p_partner_id;
  if v_status is null then
    raise exception 'Partner not found';
  end if;
  if v_status <> 'suspended' then
    raise exception 'Only a suspended partner can be reactivated';
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
        raise exception 'Cannot reactivate - this partner''s territory is now at capacity (% / %). Reassign a territory first.', v_occupied, v_capacity;
      end if;
    end if;
  end if;

  update partners set status = 'active' where partners.id = p_partner_id;

  return query select p_partner_id, 'active'::partner_status;
end;
$$;

grant execute on function reactivate_partner to authenticated;
