-- Lean & Fit - Phase 2 Admin Panel migration 2/N: media management.
-- See "Lean & Fit Phase 2 - Admin Panel Skill" spec §6-8, §21, §25 phase 5.
--
-- ADDITIVE ONLY - paste after schema.sql and 0002_admin_panel_products_pricing.sql.
-- Doesn't touch orders/payments/products/promotions.
--
-- Media files themselves live in Cloudinary (client decision, 2026-08-17 -
-- new media moving forward is stored there instead of Supabase Storage).
-- These tables only hold the *reference* to each slot's active Cloudinary
-- asset plus a history of previous uploads - no binary data in Postgres.

-- ---------------------------------------------------------------------
-- media_assets - one row per website image slot (hero, product card,
-- lifestyle moments, etc. - see src/content/mediaSlots.ts for the slot
-- registry and each slot's recommended spec). `slot` is a free-text key
-- matching that registry rather than an enum, so new slots don't need a
-- migration to add.
-- ---------------------------------------------------------------------

create table media_assets (
  slot text primary key,
  cloudinary_public_id text not null,
  cloudinary_version bigint,
  secure_url text not null,
  format text,
  width int,
  height int,
  bytes int,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger media_assets_set_updated_at
before update on media_assets
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- media_asset_history - append-only log of every upload to a slot (spec
-- §21 "Previous versions where applicable"). Old Cloudinary assets are
-- never deleted on replacement - only the reference here changes which
-- one `media_assets` currently points to.
-- ---------------------------------------------------------------------

create table media_asset_history (
  id uuid primary key default gen_random_uuid(),
  slot text not null,
  cloudinary_public_id text not null,
  secure_url text not null,
  format text,
  width int,
  height int,
  bytes int,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create index media_asset_history_slot_idx on media_asset_history(slot, created_at desc);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table media_assets enable row level security;
alter table media_asset_history enable row level security;

-- The public website reads each slot's active image URL directly (public
-- marketing asset, not PII) - same reasoning as products/promotions in
-- migration 0002.
create policy "anyone can read media assets"
  on media_assets for select
  to anon, authenticated
  using (true);

create policy "admin full access on media_assets"
  on media_assets for all to authenticated using (true) with check (true);

-- History is admin-only (version browsing in the admin panel), no anon
-- access, same as audit_log/order_status_history.
create policy "admin full access on media_asset_history"
  on media_asset_history for all to authenticated using (true) with check (true);
