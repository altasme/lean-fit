-- Lean & Fit - Reseller Portal Part 1, Phase A: territory + partner data
-- model. See "Lean & Fit Phase 2 - Partner Distribution, Reseller Portal &
-- Territorial Sales System" spec, Part 1 only (Part 2's addendum -
-- onboarding permissions, dropship/fulfillment distinction - is
-- deliberately NOT implemented yet per explicit instruction: "start with
-- part 1").
--
-- ADDITIVE ONLY except for one rename (orders.reseller_id ->
-- referral_partner_id, see below) - paste after schema.sql and migrations
-- 0002/0003.

-- ---------------------------------------------------------------------
-- IMPORTANT: authenticated != admin, starting now
-- ---------------------------------------------------------------------
--
-- Every RLS policy written so far (orders, payments, history tables,
-- products, promotions, partner_pricing_tiers, media_assets,
-- media_asset_history, audit_log) uses `to authenticated using (true)` -
-- i.e. "any authenticated user is the admin." That was safe because the
-- only authenticated users were the single admin account.
--
-- Once partner portal logins exist (Reseller Part 1 Phase D), partners
-- will ALSO be `authenticated` Supabase users - and every one of those
-- existing policies would then let any partner read/write every order,
-- payment, product, promotion, and audit log entry. This migration
-- introduces the fix (admin_users + is_admin()) and uses it correctly for
-- the new tables below, but does NOT retrofit the older tables' policies -
-- that retrofit is a hard prerequisite of Phase D, not optional cleanup,
-- and is tracked as such rather than done silently here.

create table admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

grant execute on function is_admin to authenticated;

alter table admin_users enable row level security;

create policy "admin can read admin_users"
  on admin_users for select to authenticated using (is_admin());

-- Seed: mark your existing admin account as admin. This migration can't
-- know that user's UUID - after running this file, find it in
-- Authentication -> Users and run:
--   insert into admin_users (user_id) values ('<your-admin-user-id>');

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------

create type territory_level as enum ('region', 'city', 'barangay');
create type partner_status as enum ('pending', 'active', 'suspended', 'rejected');
-- partner_type ('reseller', 'distributor', 'franchise') already exists
-- from migration 0002 - reused here, not redefined.

-- ---------------------------------------------------------------------
-- Territories - Philippines geographic hierarchy (spec Part 1 §7-9).
-- Franchise <-> region, Distributor <-> city, Reseller <-> barangay is a
-- strict 1:1 mapping per the spec, so one `capacity` column (for whichever
-- partner type that level hosts) is enough - no separate per-type
-- capacity table needed.
-- ---------------------------------------------------------------------

create table territories (
  id uuid primary key default gen_random_uuid(),
  level territory_level not null,
  name text not null,
  parent_id uuid references territories(id) on delete restrict,
  capacity int check (capacity is null or capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index territories_parent_id_idx on territories(parent_id);
create index territories_level_idx on territories(level);
-- Prevents accidentally creating the same territory twice under the same
-- parent (or twice at the top level, where parent_id is null).
create unique index territories_parent_name_key
  on territories (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

create trigger territories_set_updated_at
before update on territories
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Partners - the core entity (spec Part 1 §20-22, §64 "central
-- relationship" diagram). `user_id` is filled in once a partner has portal
-- login (Phase D) - null until then. `referral_code` is assigned on
-- activation (spec §20), not at application time, so it's nullable/unique
-- (Postgres allows multiple nulls under a unique constraint).
-- ---------------------------------------------------------------------

create table partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  partner_type partner_type not null,
  status partner_status not null default 'pending',

  full_name text not null,
  email text not null,
  mobile text not null,
  address text,

  -- Territory this partner occupies once assigned (barangay for reseller,
  -- city for distributor, region for franchise - spec §7).
  territory_id uuid references territories(id),
  -- Upstream partner responsible for supplying/fulfilling this partner
  -- (spec §21-22). Null once the parent is Lean & Fit itself (top of a
  -- Franchise's chain) or before assignment.
  parent_partner_id uuid references partners(id),

  referral_code text unique,
  -- Snapshot label of the purchased package, e.g. '10 Boxes' - spec §17
  -- ties package 1:1 to partner_type, so this is descriptive, not a
  -- separate source of truth for pricing/quantity logic.
  package text,

  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partners_territory_id_idx on partners(territory_id);
create index partners_parent_partner_id_idx on partners(parent_partner_id);
create index partners_status_idx on partners(status);
create index partners_user_id_idx on partners(user_id);

create trigger partners_set_updated_at
before update on partners
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- RLS - territories and partners
-- ---------------------------------------------------------------------

alter table territories enable row level security;

-- Public application form (Phase B) needs to list regions/cities/
-- barangays to choose from - not sensitive data.
create policy "anyone can read territories"
  on territories for select
  to anon, authenticated
  using (true);

create policy "admin full access on territories"
  on territories for all to authenticated using (is_admin()) with check (is_admin());

alter table partners enable row level security;

create policy "admin full access on partners"
  on partners for all to authenticated using (is_admin()) with check (is_admin());

-- A partner can read their own record once logged in (Phase D). Deliberately
-- no partner-initiated UPDATE policy yet - type/territory/status/referral
-- code must only ever change through admin action or a future
-- narrowly-scoped RPC (spec §51: never let a partner self-upgrade their
-- tier by any client-side path), not a blanket row-level UPDATE grant.
create policy "partner can read own record"
  on partners for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Partner application RPC - the write path for the public "Become a
-- Partner" form (Phase B). Same reasoning as create_order_with_payment in
-- schema.sql: a direct anon INSERT policy wouldn't let the client read
-- back the new row's id (RLS applies the SELECT policy to RETURNING too),
-- and a broad anon SELECT policy would expose every applicant's contact
-- info. This function inserts as its owner and returns only {partner_id,
-- status}.
--
-- Territory capacity is intentionally NOT checked here - per spec §18, a
-- partner isn't active (and doesn't occupy a capacity slot) until
-- approved; capacity is enforced at admin approval time (Phase C), not
-- application time.
-- ---------------------------------------------------------------------

create or replace function apply_for_partner(
  p_full_name text,
  p_email text,
  p_mobile text,
  p_address text,
  p_partner_type partner_type,
  p_territory_id uuid
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
  insert into partners (full_name, email, mobile, address, partner_type, territory_id, status)
  values (p_full_name, p_email, p_mobile, p_address, p_partner_type, p_territory_id, 'pending')
  returning partners.id into v_partner_id;

  return query select v_partner_id, 'pending'::partner_status;
end;
$$;

grant execute on function apply_for_partner to anon, authenticated;

-- ---------------------------------------------------------------------
-- orders: referral/partner attribution (spec Part 1 §48, §54 "Order Data
-- Model Principle", §55 historical integrity - snapshot values at
-- transaction time, don't just FK and hope the referenced rows never
-- change). `reseller_id` already existed as a nullable, unpopulated stub
-- (CLAUDE.md v2) - renamed here since a referral can now come from any
-- partner type, not only resellers (spec §28-29: distributors and
-- franchises also have referral links). Safe to rename: the column has
-- never been populated in production.
-- ---------------------------------------------------------------------

alter table orders rename column reseller_id to referral_partner_id;
alter table orders add constraint orders_referral_partner_id_fkey
  foreign key (referral_partner_id) references partners(id);

alter table orders add column referral_partner_type partner_type;
alter table orders add column referral_parent_partner_id uuid references partners(id);
alter table orders add column referral_territory_id uuid references territories(id);
-- The referral partner's tier price for this product at order time (used
-- to calculate their margin/earnings) - not what the retail customer paid.
alter table orders add column partner_price numeric(10,2);
-- Calculated payable amount to referral_partner_id for this order.
alter table orders add column partner_earnings numeric(10,2);

create index orders_referral_partner_id_idx on orders(referral_partner_id);
