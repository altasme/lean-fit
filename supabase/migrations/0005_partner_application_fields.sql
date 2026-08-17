-- Lean & Fit - Reseller Portal Part 1, Phase B fix: correct the shape of
-- the partner application.
--
-- Migration 0004 designed apply_for_partner() around a live territory_id
-- picked from the `territories` table - but no territories exist yet
-- (that's an admin-side planning concept, spec §7-14/§56-59, built later
-- in Phase G) and there's no UI yet to create them either. Spec §16 lists
-- Region/City/Barangay as plain applicant-provided fields anyway - the
-- same shape as an order's delivery address - not a live-linked picker.
-- Formal territory assignment + capacity checking happens later, at
-- admin approval (spec §18-19), not at application time.
--
-- ADDITIVE except for the function signature change (drop + recreate is
-- required since Postgres can't CREATE OR REPLACE across a changed
-- parameter list). Paste after 0004. Safe: apply_for_partner has never
-- been called from production (this feature isn't live yet).

alter table partners add column region text;
alter table partners add column city text;
alter table partners add column barangay text;

drop function if exists apply_for_partner(text, text, text, text, partner_type, uuid);

create or replace function apply_for_partner(
  p_full_name text,
  p_email text,
  p_mobile text,
  p_address text,
  p_region text,
  p_city text,
  p_barangay text,
  p_partner_type partner_type
) returns table (
  partner_id uuid,
  status partner_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
begin
  insert into partners (
    full_name, email, mobile, address, region, city, barangay, partner_type, status
  ) values (
    p_full_name, p_email, p_mobile, p_address, p_region, p_city, p_barangay, p_partner_type, 'pending'
  )
  returning partners.id into v_partner_id;

  return query select v_partner_id, 'pending'::partner_status;
end;
$$;

grant execute on function apply_for_partner to anon, authenticated;
