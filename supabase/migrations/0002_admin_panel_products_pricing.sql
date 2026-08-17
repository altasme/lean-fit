-- Lean & Fit - Phase 2 Admin Panel migration 1/N: product data model +
-- centralized pricing engine foundation. See the "Lean & Fit Phase 2 -
-- Admin Panel Skill" spec, §1-5, §9-16, §25 (phases 1-3).
--
-- ADDITIVE ONLY - paste this into the SQL editor *after* `schema.sql` has
-- already been applied. It does not touch `orders`, `payments`, or either
-- history table, so it's safe to run against a project that already has
-- real order data.
--
-- This migration covers the data model + pricing/promo calculation
-- primitives (spec phases 1-3). The application-layer pricing engine lives
-- in src/lib/pricing.ts; this file only defines the tables it reads from.
-- Admin UI (phase 4), media management (phase 5), audit UI (phase 6),
-- website integration (phase 7), and partner integration (phase 8) are
-- separate follow-up migrations/commits.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------

create type product_status as enum ('draft', 'active', 'inactive');

-- Fixed set per spec §13 - three partner/client types, not admin-creatable.
create type partner_type as enum ('reseller', 'distributor', 'franchise');

create type discount_type as enum ('percentage', 'fixed');

create type promotion_status as enum ('active', 'inactive');

-- ---------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------

-- `details` holds the richer marketing content (variant, sachet size,
-- nutrition panel, badges, prep steps, ingredients, claims, image refs)
-- as flexible JSON rather than one column per fact. SRP/status/promo_exempt
-- are real columns because the pricing engine and RLS need to query them
-- directly; the marketing copy does not.
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  srp numeric(10,2) not null check (srp >= 0),
  status product_status not null default 'draft',
  promo_exempt boolean not null default false,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_status_idx on products(status);

-- ---------------------------------------------------------------------
-- Partner pricing tiers - one row per partner_type (spec §13/§15). Admin
-- edits `discount_pct`; the three rows themselves are not admin-creatable.
-- ---------------------------------------------------------------------

create table partner_pricing_tiers (
  partner_type partner_type primary key,
  discount_pct numeric(5,2) not null check (discount_pct >= 0 and discount_pct < 100),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into partner_pricing_tiers (partner_type, discount_pct) values
  ('reseller', 20),
  ('distributor', 30),
  ('franchise', 40)
on conflict (partner_type) do nothing;

-- ---------------------------------------------------------------------
-- Promotions (spec §9-11)
-- ---------------------------------------------------------------------

create table promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  discount_type discount_type not null,
  discount_value numeric(10,2) not null check (discount_value >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int check (usage_limit is null or usage_limit > 0),
  times_used int not null default 0,
  status promotion_status not null default 'inactive',
  -- Empty array = applies to every non-exempt product. Non-empty = only
  -- those product ids (still subject to that product's promo_exempt flag).
  applicable_product_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index promotions_status_idx on promotions(status);
create index promotions_code_idx on promotions(code);

-- ---------------------------------------------------------------------
-- Audit log (spec §17-19) - generic across entity types so every phase
-- (products, pricing, promotions, partners, media, orders) writes to the
-- same table instead of one bespoke log per feature.
-- ---------------------------------------------------------------------

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text,
  action text not null,
  field text,
  previous_value text,
  new_value text,
  changed_by uuid,
  note text,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log(entity_type, entity_id);
create index audit_log_created_at_idx on audit_log(created_at desc);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------

-- Reuses set_updated_at() from schema.sql - do not redefine it here.

create trigger products_set_updated_at
before update on products
for each row execute function set_updated_at();

create trigger promotions_set_updated_at
before update on promotions
for each row execute function set_updated_at();

create trigger partner_pricing_tiers_set_updated_at
before update on partner_pricing_tiers
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table products enable row level security;
alter table partner_pricing_tiers enable row level security;
alter table promotions enable row level security;
alter table audit_log enable row level security;

-- Products: the public website/checkout needs to read live SRP/content for
-- active products directly (this is public marketing/pricing data, not
-- customer PII, so a direct anon SELECT policy is appropriate here -
-- unlike orders/payments, see schema.sql's note on that RPC pattern).
create policy "anyone can read active products"
  on products for select
  to anon, authenticated
  using (status = 'active');

create policy "admin full access on products"
  on products for all to authenticated using (true) with check (true);

-- Promotions: checkout needs to read currently-active promotions to
-- calculate/validate a promo code price client-side. Only active rows are
-- exposed; draft/inactive/expired promo details stay admin-only.
create policy "anyone can read active promotions"
  on promotions for select
  to anon, authenticated
  using (status = 'active');

create policy "admin full access on promotions"
  on promotions for all to authenticated using (true) with check (true);

-- Partner pricing is not retail-facing (no partner portal/auth exists yet
-- - see spec phase 8 / CLAUDE.md's deferred reseller portal), so admin-only
-- for now.
create policy "admin full access on partner_pricing_tiers"
  on partner_pricing_tiers for all to authenticated using (true) with check (true);

-- Audit log is admin-only, read and write, no anon access at all.
create policy "admin full access on audit_log"
  on audit_log for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- Seed: migrate the current single hardcoded product so the pricing
-- engine has real data to operate on immediately. Marketing `details`
-- (nutrition panel, ingredients, claims, etc.) stay in src/content/product.ts
-- until phase 4 (admin UI) / phase 7 (website integration) land - seeding
-- them here now would just be a second, harder-to-maintain copy in the
-- meantime.
-- ---------------------------------------------------------------------

insert into products (slug, name, description, srp, status, promo_exempt)
values (
  'lean-fit-classic',
  'Lean & Fit Protein Coffee - Classic',
  'High protein, low sugar functional coffee for an active lifestyle.',
  250,
  'active',
  false
)
on conflict (slug) do nothing;
