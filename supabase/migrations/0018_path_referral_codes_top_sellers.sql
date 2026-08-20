-- Lean & Fit - referral URL rework + top-seller leaderboard.
-- Client request: referral links must be path-based
-- (leanandfit.ph/juandelacruz), functioning as a real attribution
-- tracker, plus month-filterable online-sales/earnings cards and a
-- top-20 leaderboard shown both in the partner portal and admin. Paste
-- after 0017.

-- ---------------------------------------------------------------------
-- generate_referral_code(): was "first word of full name, uppercased,
-- max 12 chars" (migration 0006) - built when the referral code was only
-- ever shown as a `?ref=CODE` query param, so its shape didn't matter
-- much. Now it doubles as a URL path segment
-- (leanandfit.ph/{referral_code} - see src/lib/partners.ts
-- buildReferralUrl and the new /:slug catch-all route), so it's rewritten
-- to match the client's example ("Juan Dela Cruz" -> "juandelacruz"):
-- the FULL name, not just the first word, lowercased, with everything
-- that isn't a letter/digit stripped.
--
-- Existing active partners keep whatever code they already have -
-- order attribution has always matched case-insensitively
-- (create_order_with_payment: `upper(referral_code) = upper(trim(...))`),
-- so an old-format code like "MARIA3" still works fine as a path segment
-- (leanandfit.ph/MARIA3); no backfill needed, and no already-shared link
-- breaks. Only newly-generated codes (new approvals / admin-created
-- active partners) get the new lowercase full-name format.
--
-- Reserved-word guard is new: a referral code that collided with one of
-- the app's real top-level paths (checkout, admin, reseller, ...) would
-- silently never work as a referral link - the app's static route always
-- wins over the /:slug catch-all, so that partner's link would just
-- 404-redirect-to-home without ever capturing attribution. Skip past
-- those the same way collisions with an existing partner are skipped
-- (numeric suffix).
create or replace function generate_referral_code(p_full_name text) returns text
language plpgsql
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix int := 0;
  v_reserved text[] := array[
    'checkout', 'order-confirmed', 'reseller', 'admin', 'api',
    'favicon.ico', 'robots.txt', 'assets', 'static'
  ];
begin
  v_base := lower(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g'));
  if v_base = '' then
    v_base := 'partner';
  end if;
  v_base := left(v_base, 20);

  v_candidate := v_base;
  while exists (select 1 from partners where referral_code = v_candidate)
     or v_candidate = any (v_reserved) loop
    v_suffix := v_suffix + 1;
    v_candidate := v_base || v_suffix::text;
  end loop;

  return v_candidate;
end;
$$;

-- ---------------------------------------------------------------------
-- get_top_sellers(): top-20 partners by online (referred, paid) sales,
-- optionally scoped to one calendar month. Powers both the partner
-- portal's "Top Seller Rankings" tab and admin's "Top Sellers" page -
-- same query, same privacy boundary either way.
--
-- SECURITY DEFINER because it must aggregate across ALL partners' orders,
-- which no partner's own RLS (migration 0009) allows them to read
-- directly - that's the point of a narrow, aggregate-only RPC instead of
-- widening the orders/partners select policies. Only ever returns a
-- partner's name/type and aggregate totals, never email/mobile/address or
-- any other partner's individual order/customer rows.
--
-- "Online sales" follows the same revenue convention as admin's
-- "Revenue (Paid)" card (src/components/admin/OrderStats.tsx): payment
-- must have actually cleared (`payments.status = 'paid'`), and a
-- cancelled or returned-to-seller order never counts even if it was paid
-- first.
create or replace function get_top_sellers(p_month date default null)
returns table (
  partner_id uuid,
  full_name text,
  partner_type partner_type,
  online_sales numeric,
  earnings numeric,
  order_count int
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.full_name,
    p.partner_type,
    coalesce(sum(o.total), 0)::numeric as online_sales,
    coalesce(sum(o.partner_earnings), 0)::numeric as earnings,
    count(o.id)::int as order_count
  from partners p
  join orders o on o.referral_partner_id = p.id
  join payments pay on pay.order_id = o.id
  where pay.status = 'paid'
    and o.status not in ('cancelled', 'returned')
    and (p_month is null or date_trunc('month', o.created_at) = date_trunc('month', p_month::timestamptz))
  group by p.id, p.full_name, p.partner_type
  order by online_sales desc, p.full_name asc
  limit 20;
$$;

-- Both admin (admin_users) and partners (partners.user_id) authenticate
-- as Supabase `authenticated` role - this RPC is the only thing exposing
-- cross-partner aggregate data to a partner session, deliberately not
-- granted to `anon`. Postgres grants EXECUTE on a new function to PUBLIC
-- by default (every role implicitly inherits PUBLIC), so `grant ... to
-- authenticated` alone does NOT exclude anon - explicitly revoke PUBLIC's
-- default grant first, or an anonymous website visitor could call this
-- and see every partner's name and sales figures.
revoke all on function get_top_sellers from public;
grant execute on function get_top_sellers to authenticated;
