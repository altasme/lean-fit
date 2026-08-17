# Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor (or `supabase db push` if
   using the CLI with migrations). It creates the `orders` / `payments` /
   `order_status_history` / `payment_status_history` tables, RLS policies,
   the `create_order_with_payment` RPC, and the private `payment-proofs`
   storage bucket + its policies.
3. Create the single admin user in **Authentication → Users** (email +
   password). This is the only account gating `/admin` for MVP.
4. Deploy the Edge Functions:
   ```bash
   supabase functions deploy send-order-email
   supabase functions deploy capi-purchase
   ```
5. Set Edge Function secrets:
   ```bash
   supabase secrets set RESEND_API_KEY=...
   supabase secrets set BUSINESS_NOTIFICATION_EMAIL=...
   supabase secrets set EMAIL_FROM="Lean & Fit <orders@yourdomain.com>"
   # phase 2 (CAPI), not required for MVP:
   supabase secrets set META_CAPI_TOKEN=...
   supabase secrets set META_PIXEL_ID=...
   # SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically
   # in the Edge Function runtime - no need to set them manually.
   ```
6. Copy the project URL + anon key into `.env` (see `.env.example` at the
   repo root) as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
7. Run `supabase/migrations/0002_admin_panel_products_pricing.sql` in the
   SQL editor, **after** `schema.sql`. It's additive only (new tables/types,
   nothing touches `orders`/`payments`/history) so it's safe to run against
   a project that already has real order data - see "Admin Panel Phase 2"
   below.

**Status for the live project:** schema applied, `RESEND_API_KEY`,
`BUSINESS_NOTIFICATION_EMAIL` (`vanamaranto1@gmail.com`), and `EMAIL_FROM`
(`Lean & Fit <realfitorders@altasme.com>`, sending domain verified in
Resend) are set. `META_CAPI_TOKEN`/`META_PIXEL_ID` remain unset (phase 2,
not required for MVP launch).

## Order → Payment → Provider (v2)

CLAUDE.md §6/§11 (v2) splits payment out of the order entirely: `orders`
tracks fulfillment only (`pending → confirmed → packing → shipped →
completed`, or `cancelled`), and `payments` tracks the payment lifecycle
independently (`pending`/`pending_verification` → `paid`/`failed`/
`rejected`/`refunded`/`cancelled`). A `provider` column (`manual` today,
`cod` for cash-on-delivery, `paymongo` reserved for later - not built, see
CLAUDE.md §13) is what makes adding a payment gateway later a config
change rather than a rebuild of checkout/orders/admin.

**Greenfield rebuild, not a migration.** CLAUDE.md §16 describes a
migration path for when Phase 1's v1 schema (payment fields on `orders`,
single blended status enum) already has real order data. That was never
the case here - no Supabase project had been provisioned for this repo
when v2 landed - so `schema.sql` was rewritten directly to the v2
canonical schema instead. If you're reading this after standing up a
project against the v1 schema with live orders, follow §16 instead of
just re-running this file.

## Why `create_order_with_payment` is an RPC, not direct anon INSERTs

CLAUDE.md §11 describes the RLS as "orders, payments: anon INSERT
(checkout) only." Implemented literally, checkout would insert correctly
but the client could never read back the new order's `order_no`/`id` -
Postgres applies the table's SELECT policy to the `RETURNING` clause of an
INSERT, and there's no anon SELECT policy (by design, since that would let
anyone read every customer's name, address, email, phone number, or
payment proof path).

`create_order_with_payment()` is a `SECURITY DEFINER` function that
performs both inserts (order + its payment row) as its owner, atomically,
bypassing RLS entirely (same intent as "allow anon insert"), and returns
only `{order_id, order_no, order_status, payment_id, payment_no,
payment_status}` - never the rows' PII. Neither `orders` nor `payments`
has any anon-facing policy at all; `authenticated` (the admin) has full
access on both, plus both history tables, as specified.

## Status flow (two independent axes - do not merge)

```
Manual (GCash/Maya/Bank Transfer):
  submit -> order:pending / payment:pending_verification
  admin approve -> payment:paid, auto-advance order:confirmed
  admin reject  -> payment:rejected (order stays pending; customer corrects, resubmits)
  -> packing -> shipped -> completed

COD:
  submit -> order:confirmed / payment:pending
  -> packing -> shipped -> completed
  admin marks payment:paid on cash collection (does not affect order status - already confirmed)

Exceptions (either flow): payment:refunded (admin, external) · order:cancelled (admin)
```

Rule: whenever `payment.status -> paid` and `order.status = pending`,
auto-advance `order -> confirmed`. This is implemented in
`src/lib/adminOrders.ts` (`approvePayment`), not a DB trigger.

Every admin action that changes customer-visible status is expected to
call the `send-order-email` Edge Function (already wired from
`src/components/admin/StatusControls.tsx`) so the customer gets the
matching email from CLAUDE.md §10. Checkout submission does the same for
the initial order-received / order-confirmed-COD email.

## Admin Panel Phase 2 (products, pricing, promotions, partners)

`migrations/0002_admin_panel_products_pricing.sql` adds the data model for
the "Lean & Fit Phase 2 - Admin Panel" spec (uploaded 2026-08-17): a
centralized `products` table (SRP, status, promo eligibility), fixed-tier
`partner_pricing_tiers` (reseller 20% / distributor 30% / franchise 40%,
seeded and admin-editable), code-based `promotions`, and a generic
`audit_log`. This is phases 1-3 of that spec's build order (data model +
pricing engine + promo engine) - schema and calculation logic only, no
admin UI yet (that's phase 4, tracked separately).

**RLS differs from orders/payments on purpose.** `products` and
`promotions` grant anon a direct `SELECT` (filtered to `status = 'active'`)
because this is public marketing/pricing data the website needs to read
directly, not customer PII - unlike orders/payments, no RPC indirection is
needed here. `partner_pricing_tiers` and `audit_log` stay admin-only; there
is no partner-facing auth surface yet (phase 8, not built).

**Pricing engine** lives in `src/lib/pricing.ts`, not the database - it's
the single place retail price (SRP, optionally reduced by a promo code)
and partner price (SRP reduced by a fixed tier %) get calculated, per the
spec's "never calculate price independently in product cards / checkout /
admin" rule (§12). Retail promotions never apply to partner pricing (§16).
Verified locally against the spec's own worked examples (SRP ₱380 →
reseller ₱304 / distributor ₱266 / franchise ₱228) plus promo edge cases
(exempt products, expired/future/usage-capped promotions, product-targeted
promos, case-insensitive code matching) - all pass.

Not yet wired to anything - no admin UI to manage this data (phase 4), the
public site still reads `src/content/product.ts` (phase 7), and there's no
partner portal to consume partner pricing (phase 8). Those are tracked as
separate follow-up work.
