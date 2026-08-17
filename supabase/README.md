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
8. Run `supabase/migrations/0003_admin_panel_media.sql` in the SQL editor,
   after 0002. Also additive only.
9. Deploy the media Edge Function and set its secrets:
   ```bash
   supabase functions deploy cloudinary-sign
   supabase secrets set CLOUDINARY_API_KEY=...
   supabase secrets set CLOUDINARY_API_SECRET=...
   supabase secrets set CLOUDINARY_CLOUD_NAME=...
   ```
   `CLOUDINARY_API_SECRET` must only ever be set here (an Edge Function
   secret) - never in `.env`, never as a `VITE_*` var. See "Admin Panel
   Phase 5" below for why.

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
the single place retail price and partner price (SRP reduced by a fixed
tier %) get calculated, per the spec's "never calculate price
independently in product cards / checkout / admin" rule (§12). Retail
promotions never apply to partner pricing (§16).

Retail pricing has two promotion mechanisms, and **they never stack**:
- `auto_apply = true` promotions apply automatically as the product's
  "current price," no code needed.
- `auto_apply = false` promotions only apply when the customer enters that
  exact code.

A code entered at checkout always *replaces* an active auto-apply
promotion rather than combining with it - e.g. a 10%-off sitewide
promotion plus a ₱50-off code never becomes both discounts at once, only
whichever one the pricing engine selects (the code, if valid; otherwise
the auto-apply promotion; otherwise SRP). If multiple auto-apply
promotions are active simultaneously, only the one yielding the lowest
price applies - never combined with each other either. Verified locally
against the spec's own worked examples (SRP ₱380 → reseller ₱304 /
distributor ₱266 / franchise ₱228) plus promo edge cases (exempt products,
expired/future/usage-capped promotions, product-targeted promos,
case-insensitive code matching, and the no-stacking rule) - all pass.

**Phase 4 (admin UI) is also done** - `/admin/products`, `/admin/promotions`,
and `/admin/partner-pricing` manage all of the above through the app, not
just the database. Still open: the public site itself still reads
`src/content/product.ts` rather than the `products` table (phase 7), and
there's no partner portal to consume partner pricing (phase 8).

Every write from these three pages also logs to `audit_log` - see "Admin
Panel Phase 6" below.

## Admin Panel Phase 5 (media management)

`migrations/0003_admin_panel_media.sql` adds `media_assets` (one row per
website image slot - the current active asset) and `media_asset_history`
(every previous upload to that slot, spec §21). The slot registry itself
- each slot's label, recommended dimensions, aspect ratio, format, and max
file size (spec §7, "each slot defines its own spec, not one universal
size") - lives in `src/content/mediaSlots.ts`, not the database, so adding
a new slot is a code change, not a migration.

**Media files live in Cloudinary, not Supabase Storage** - a client
decision (2026-08-17): "new medias moving forward are stored in
Cloudinary." Postgres only stores the reference (`cloudinary_public_id`,
`secure_url`, dimensions, format, bytes) - no binary data.

**Why there's an Edge Function for this.** Cloudinary uploads need either
an unsigned upload preset (configured in Cloudinary's own dashboard, not
here) or a signed request. This project uses signed uploads:
`supabase/functions/cloudinary-sign` mints a timestamp + folder + SHA-1
signature using `CLOUDINARY_API_SECRET` server-side, and the browser
uploads the file directly to Cloudinary using that signature -
`CLOUDINARY_API_SECRET` never reaches client code. The function also
rejects any caller that isn't a signed-in Supabase user, so only the admin
can mint upload signatures. The signing algorithm was verified against
Cloudinary's own official Node SDK (`cloudinary.utils.api_sign_request`)
locally before shipping - byte-for-byte match.

Replacing a slot's image **does not delete** the previous Cloudinary asset
- `media_assets` is upserted to point at the new one, and the old
reference is preserved in `media_asset_history` (visible in the admin
Media page under "View history" for each slot). Nothing is ever deleted
automatically.

`/admin/media` is the admin UI for all of this: per-slot spec guidance,
a live local preview before upload (spec §8), the upload itself, and
history browsing. Verified interactively end-to-end (mock Supabase/
Cloudinary calls, since this sandbox can't reach either live service) -
file select shows an instant local preview, upload updates the active
asset and appends to history, oversized/non-image files are rejected
client-side before ever reaching Cloudinary.

Not yet wired: the public website still renders its own static imported
images rather than reading from `media_assets` (phase 7, same as products).

Uploads also log to `audit_log` (`image_replaced`) - see "Admin Panel
Phase 6" below.

## Admin Panel Phase 6 (audit system)

No new migration - `audit_log` already existed from migration 0002, just
unused until now. This phase wires writes into it and adds the viewer UI.

**Where entries come from:**
- `src/lib/auditLog.ts` - `writeAuditLog()` (one entry) and
  `logFieldChanges()` (diffs a before/after object field-by-field, writing
  one row per changed field - this is what produces the spec §19-style
  "Previous: ₱380 / New: ₱400" entries).
- Products: `create` logs one `created` entry; `update` fetches the row
  first and diffs name/description/SRP/status/promo-exempt.
- Promotions: same pattern - `created` on insert, field diff on update
  (code, discount type/value, dates, usage limit, status, applicable
  products, auto-apply).
- Partner pricing: `updatePartnerDiscount` logs
  `Previous: 20% / New: 25%` for whichever tier changed.
- Media: every successful upload logs `image_replaced` for that slot.
- Orders/payments: `setOrderStatus`/`setPaymentStatus` in
  `src/lib/adminOrders.ts` (the two chokepoints every order/payment
  mutation already funnels through) each also write an audit_log entry
  alongside their existing dedicated history-table insert - so
  `order_status_history`/`payment_status_history` keep driving the
  per-order timeline UI unchanged, while `audit_log` gets a matching
  cross-entity record for the unified Audit Log view.

**Audit logging is best-effort, on purpose.** `writeAuditLog` catches its
own errors and logs to the console rather than throwing - a logging
failure must never roll back or block the real mutation it's describing.

**Also new this round: save confirmation toasts.** Every admin write
(products, promotions, partner pricing, media, and every order/payment
action in `StatusControls`) now shows a toast on success or failure
(`src/components/ui/Toast.tsx`), not just a silent state change - flagged
as a UX gap after products/promotions saves gave no feedback.

`/admin/audit-log` is the viewer: entity-type filter, search across
entity id/field/note, most recent first. `changed_by` resolves to "Admin"
rather than an email, since `auth.users` isn't queryable from the client
and this is a single-admin-account MVP (CLAUDE.md) - not worth a lookup
mechanism for one account.

Verified interactively (mocked Supabase, since this sandbox can't reach
the live project): editing a product's SRP and status produced exactly
two audit rows (`SRP: 250 → 399`, `Status: active → inactive`); the
entity-type filter and search both narrowed the list correctly; the save
toast appeared alongside the new audit rows.

## Admin Panel Phase 7 (website integration)

No new migration - this phase connects the public site and checkout to
tables that already existed (`products`, `promotions`). Price is now live
everywhere, closing out the spec's core non-negotiable rule (§26 #1: "do
not hard-code product prices").

**Where the live fetch happens.** `src/lib/product.ts`
(`fetchActiveProduct`) is the single query both the homepage and checkout
call into - fetches the (oldest) active product, fetches active
promotions, and runs both through the *same* `calculateRetailPrice()` from
`src/lib/pricing.ts` that admin already used. No separate pricing logic
for the product page vs checkout (spec §12/§26 #3).

**How it reaches components.** `src/hooks/useActiveProduct.ts` wraps that
fetch and pushes the result into the Zustand cart store
(`src/store/cart.ts`), which now holds `productName`/`unitPrice`/
`deliveryFee` as real state instead of reading a hardcoded import -
`subtotal()`/`total()` compute off that state. `Purchase` (homepage),
`ProductIntro` (pixel tracking value), `OrderSummary`, and `Checkout`
each call the hook independently; multiple calls just re-fetch and
re-set the same store fields, which is harmless and keeps every
component self-sufficient (matches how the rest of this codebase avoids
prop-drilling product data).

**`src/content/product.ts` no longer has a `price` field at all** - it was
removed rather than left as unused/misleading dead data. What's left
there (nutrition panel, ingredients, badges, prep steps, claims, delivery
fee) is intentionally still static: the Admin Panel spec's Phase 4 field
list for products was name/description/SRP/images/status/promo-eligibility,
not the full marketing content model, so building that out was treated as
a scope decision rather than an oversight - flag it if the client expects
those fields to be admin-editable too, that would extend the `products`
schema and `/admin/products` form.

**Graceful degradation, not a stale fallback.** If no active product
exists (all draft/inactive) the site shows "TBD"/"Price Coming Soon" and
disables the buy button - the same UX the site already had for an unset
price, just now driven by "no active product found" instead of "price is
null in a static file." It never falls back to showing an old hardcoded
number.

**Order creation** now takes the live product name as an explicit
`productName` parameter (`src/lib/orders.ts`) rather than importing the
static constant - still no risk to historical order integrity (spec §20),
since `orders.unit_price`/`subtotal`/`total`/`product` are snapshotted at
submission time regardless of where the values originated.

Verified interactively (mocked `fetchActiveProduct`, since this sandbox
can't reach the live Supabase project) across three scenarios: normal
(SRP ₱250, quantity change recalculates subtotal correctly, and the same
values carry through from the homepage into checkout's Order Summary),
promo-active (`Purchase` shows the discounted ₱200, never the ₱250 SRP),
and no-active-product (price and buy button both show the existing
"coming soon" state, not a broken or stale render).

**Still open (phase 8, now underway - see below):** no reseller/partner
portal exists yet to consume `partner_pricing_tiers` - that's the
remaining piece of the client's "admin, website, and reseller panel must
stay in sync" requirement.

## Reseller Portal Part 1, Phase A (territories + partners)

A second, much larger spec landed 2026-08-17: "Lean & Fit Phase 2 -
Partner Distribution, Reseller Portal & Territorial Sales System" (+ a
Part 2 addendum covering onboarding permissions and dropship/fulfillment
visibility). Saved to `docs/RESELLER_PORTAL_SPEC_PART1.md` /
`_PART2_ADDENDUM.md`. Building starts with Part 1 only, per explicit
instruction - Part 2's rules (who can onboard whom, `fulfillment_method`,
staff admin roles) are not implemented yet.

`migrations/0004_reseller_territories_partners.sql` adds:

- **`territories`** - Philippines region/city/barangay hierarchy
  (self-referencing `parent_id`), each with a `capacity` for the one
  partner type that level hosts (region↔franchise, city↔distributor,
  barangay↔reseller - spec §7 is a strict 1:1 mapping, so no separate
  per-type capacity table was needed).
- **`partners`** - the core entity: type, status, contact info, territory,
  `parent_partner_id` (upstream partner), referral code, package. `user_id`
  is nullable and filled in once portal login exists (Phase D).
- **`apply_for_partner()`** RPC - the write path for the public
  application form (Phase B), same reasoning as `create_order_with_payment`
  in `schema.sql` (anon can't get a usable RETURNING without a broad,
  PII-exposing SELECT policy, so a `SECURITY DEFINER` function does the
  insert and returns only `{partner_id, status}`). Territory capacity is
  deliberately NOT checked here - spec §18 makes a partner "active" (and
  therefore occupying a capacity slot) only after admin approval, so
  capacity enforcement belongs at approval time (Phase C), not application
  time.
- **`orders`** extended with referral/partner attribution, snapshotted at
  order-creation time per spec §54-55 (historical integrity - a later
  territory or hierarchy change must never rewrite what an order recorded):
  `referral_partner_id` (renamed from the unpopulated `reseller_id` stub -
  safe, since it was never populated in production, and the rename
  reflects that any partner type can have a referral, not only resellers),
  `referral_partner_type`, `referral_parent_partner_id`,
  `referral_territory_id`, `partner_price`, `partner_earnings`.

### A security fix that had to happen now, not later

Every RLS policy written so far (`orders`, `payments`, history tables,
`products`, `promotions`, `partner_pricing_tiers`, `media_assets`,
`media_asset_history`, `audit_log`) uses `to authenticated using (true)` -
"any authenticated user is the admin." That was safe when the only
authenticated users were the single admin account. Once partner portal
logins exist (Phase D), partners become `authenticated` Supabase users
too, and every one of those existing policies would let any partner
read/write every order, payment, product, and audit log entry.

This migration adds `admin_users` (a marker table) and `is_admin()` (checks
membership) and uses them correctly for `territories`/`partners` from day
one. **It does not retrofit the older tables' policies** - that retrofit
(swap `using (true)` for `using (is_admin())` everywhere) is a hard
prerequisite of Phase D, tracked explicitly, not something to discover
after partner accounts already exist.

After running this migration, seed your admin account:
```sql
insert into admin_users (user_id) values ('<your-admin-user-id>');
```
(Find the UUID in Authentication → Users.)

### Verification

Applied cleanly on top of schema.sql + migrations 0002/0003 against a
local Postgres instance, including a stub `auth.uid()` reading a settable
session variable to exercise RLS as different simulated users. Confirmed:
anon can submit an application via `apply_for_partner()` but cannot read
the `partners` table directly (PII protection, same pattern as
orders/payments); a non-admin authenticated user is also blocked; an
`is_admin()` user has full read/write; a partner logged in as themselves
(`user_id = auth.uid()`) sees exactly their own row and nothing else, even
with a second unrelated partner present in the table; the
`reseller_id` → `referral_partner_id` rename plus all five new `orders`
columns landed correctly.

Not yet built: the application form itself, packages/payment/approval,
partner login, referral attribution + tier-aware checkout pricing, the
partner dashboard, admin partner/territory management, and territory
visualization (see the repo's task list, "Reseller P1-B" through "P1-H").
