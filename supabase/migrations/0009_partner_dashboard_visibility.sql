-- Lean & Fit - Reseller Portal Part 1, Phase F: partner dashboard. See
-- spec Part 1 §40-48. Pure RLS addition - no new tables/columns. Paste
-- after 0002-0008.
--
-- Partners could log in since Phase D, but had no read access to orders,
-- payments, or each other's basic info at all (RequirePartnerAuth only
-- ever fetched their own `partners` row). This migration grants exactly
-- the read scope the dashboard needs and nothing more:
--   - their own orders (self-checkout) and orders they referred
--   - the payment record on any order they can already see
--   - their direct parent partner and direct downstream partners (for
--     "Parent Distributor/Franchise" / downstream sections, spec §46) -
--     nothing currently POPULATES parent_partner_id (no admin UI exists
--     yet - that's Phase G), so this is forward groundwork that will
--     just show empty until then, added now rather than as another
--     RLS-retrofit-style afterthought.
--
-- Each policy below needs "my own partner id/email/parent" as an input.
-- A naive subquery on `partners` from inside a `partners` policy (or an
-- `orders`/`payments` policy that itself gets evaluated while resolving
-- a `partners` policy) trips "infinite recursion detected in policy for
-- relation" - confirmed locally. Same fix as is_admin() in migration
-- 0004: wrap the self-lookup in a SECURITY DEFINER function, which runs
-- with the function owner's privileges and so bypasses RLS for that one
-- internal query instead of re-triggering policy evaluation.

create or replace function my_partner_id() returns uuid
language sql stable
security definer
set search_path = public
as $$
  select id from partners where user_id = auth.uid();
$$;

grant execute on function my_partner_id to authenticated;

create or replace function my_partner_email() returns text
language sql stable
security definer
set search_path = public
as $$
  select email from partners where user_id = auth.uid();
$$;

grant execute on function my_partner_email to authenticated;

create or replace function my_parent_partner_id() returns uuid
language sql stable
security definer
set search_path = public
as $$
  select parent_partner_id from partners where user_id = auth.uid();
$$;

grant execute on function my_parent_partner_id to authenticated;

create policy "partner can read own or referred orders"
  on orders for select
  to authenticated
  using (
    referral_partner_id = my_partner_id()
    or lower(email) = lower(my_partner_email())
  );

create policy "partner can read payments on own or referred orders"
  on payments for select
  to authenticated
  using (
    order_id in (
      select o.id from orders o
      where o.referral_partner_id = my_partner_id()
         or lower(o.email) = lower(my_partner_email())
    )
  );

create policy "partner can read own downstream and parent partners"
  on partners for select
  to authenticated
  using (
    parent_partner_id = my_partner_id()
    or id = my_parent_partner_id()
  );
