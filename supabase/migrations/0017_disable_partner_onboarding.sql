-- Lean & Fit - client decision: partners can no longer onboard other
-- partners (Part 2 Route B is disabled). Paste after 0016.
--
-- Rejects server-side, not just hidden in the UI - the RPC stays granted
-- to `authenticated` (nothing to revoke/re-grant if this comes back) but
-- now unconditionally raises before doing anything else, so a partner
-- can't bypass the hidden "Add Partner" page by calling the RPC directly
-- with their own session. The rest of the function body is left in place
-- rather than deleted, matching how the rest of this app hides features
-- instead of removing them.

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
  raise exception 'Partners can no longer onboard other partners - this is now an admin-only action.';

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
