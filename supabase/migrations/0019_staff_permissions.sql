-- Lean & Fit - granular staff permissions.
-- Client request: admins can edit an existing staff account, "including
-- permissions on what they can and can't do." Today a staff_admin is
-- either fully blocked from Products/Promotions/Partner Pricing
-- (is_full_admin() only) or - if promoted to 'admin' - has everything.
-- This adds a per-staff-account permission toggle for exactly those three
-- areas (the only ones currently gated at all) instead of that all-or-
-- nothing split. Paste after 0018.
--
-- Deliberately NOT made permission-gated: Orders/Partners/Top Sellers/
-- Audit Log (already open to every admin_users member, unchanged) and
-- User Management itself (creating/editing other admin accounts stays
-- role='admin'-only, full stop - granting that as a togglable permission
-- would let a staff account hand itself more access, a real privilege-
-- escalation hole, not just a UX nicety).

alter table admin_users add column permissions jsonb not null default '{}'::jsonb;

-- has_permission(): true for a full admin unconditionally (they already
-- pass every is_full_admin() check that used to gate these tables - this
-- widens who CAN pass, it doesn't narrow what a full admin already had),
-- or for a staff_admin whose permissions jsonb has that key set true.
-- Missing/false/non-boolean keys default to false via the `coalesce` -
-- an account created before this migration (permissions = '{}') is
-- exactly as restricted as it is today until an admin explicitly grants
-- something.
create or replace function has_permission(p_key text) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select is_full_admin() or exists (
    select 1 from admin_users
    where user_id = auth.uid()
      and role = 'staff_admin'
      and coalesce((permissions->>p_key)::boolean, false)
  );
$$;

grant execute on function has_permission to authenticated;

alter policy "admin full access on products"
  on products using (has_permission('products')) with check (has_permission('products'));

alter policy "admin full access on promotions"
  on promotions using (has_permission('promotions')) with check (has_permission('promotions'));

alter policy "admin full access on partner_pricing_tiers"
  on partner_pricing_tiers using (has_permission('partner_pricing')) with check (has_permission('partner_pricing'));
