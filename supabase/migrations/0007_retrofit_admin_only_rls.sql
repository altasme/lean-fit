-- Lean & Fit - Reseller Portal Part 1: RLS retrofit.
--
-- Flagged as a hard prerequisite by migration 0004's header comment: every
-- policy written before 0004 grants `to authenticated using (true)` on the
-- assumption that "authenticated == the single admin account." That
-- assumption breaks the moment Phase D (partner auth) ships partner
-- logins, since partners are `authenticated` Supabase users too - without
-- this retrofit, any partner account would be able to read/write every
-- order, payment, product, promotion, and audit log row.
--
-- ADDITIVE ONLY in the sense that it doesn't touch table shape - it only
-- tightens existing "admin full access" policies from `using (true)` to
-- `using (is_admin())`. Paste after 0002-0006. Run before Phase D.
--
-- Public-read policies (anyone can read active products/promotions/media
-- assets) are untouched - those are intentionally open to anon.

alter policy "admin full access on orders"
  on orders using (is_admin()) with check (is_admin());

alter policy "admin full access on payments"
  on payments using (is_admin()) with check (is_admin());

alter policy "admin full access on order_status_history"
  on order_status_history using (is_admin()) with check (is_admin());

alter policy "admin full access on payment_status_history"
  on payment_status_history using (is_admin()) with check (is_admin());

alter policy "admin full access on products"
  on products using (is_admin()) with check (is_admin());

alter policy "admin full access on promotions"
  on promotions using (is_admin()) with check (is_admin());

alter policy "admin full access on partner_pricing_tiers"
  on partner_pricing_tiers using (is_admin()) with check (is_admin());

alter policy "admin full access on audit_log"
  on audit_log using (is_admin()) with check (is_admin());

alter policy "admin full access on media_assets"
  on media_assets using (is_admin()) with check (is_admin());

alter policy "admin full access on media_asset_history"
  on media_asset_history using (is_admin()) with check (is_admin());

-- Storage: payment proof reads were also gated on `to authenticated` only.
alter policy "admin can read payment proofs"
  on storage.objects using (bucket_id = 'payment-proofs' and is_admin());
