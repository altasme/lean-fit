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
10. Run `migrations/0004` through `0008` in the SQL editor, in order (see
    "Reseller Portal Part 1" sections below for what each adds). After
    0004, mark your admin account: find its id in **Authentication →
    Users** and run `insert into admin_users (user_id) values ('<uuid>');`
    - `RequireAuth` (the `/admin` route guard) now requires this row, not
    just a session, so skipping it locks the admin app's UI (data access
    was already RLS-gated on it since 0004/0007 - see "RLS retrofit"
    below). **If your project already has migrations 0002-0007 applied,
    still run 0008** - it fixes a real pricing bug (see "Reseller Portal
    Part 1, Phase E" below: `partner_pricing_tiers` had no anon-read
    policy, so every partner package has been quoted at full SRP with 0%
    tier discount since Phase C shipped).
11. Deploy the partner-portal invite function and set its secret:
    ```bash
    supabase functions deploy invite-partner
    supabase secrets set SITE_URL=https://yourdomain.com
    ```
    `SITE_URL` is the **public marketing site's** origin (not the admin
    subdomain) - it's where invite/password-reset links redirect partners
    to finish setup (`SITE_URL/reseller/set-password`). That exact URL
    must also be added to **Authentication → URL Configuration → Redirect
    URLs** in the Supabase dashboard, or Supabase will reject the redirect
    and the link will silently fall back to its default.

**Status for the live project:** schema applied, `RESEND_API_KEY`,
`BUSINESS_NOTIFICATION_EMAIL` (`vanamaranto1@gmail.com`), and `EMAIL_FROM`
(`Lean & Fit <realfitorders@altasme.com>`, sending domain verified in
Resend) are set. `META_CAPI_TOKEN`/`META_PIXEL_ID` remain unset (phase 2,
not required for MVP launch). Migrations 0002-0007 have been applied;
**0008 still needs to be run** (see the pricing bug fix note above/below -
it's additive/safe to run any time, no backfill required).
`invite-partner` and its `SITE_URL` secret are not yet deployed/set - do
that before relying on the "Approve Partner" button to also send the
partner's portal invite (approval itself still works either way; only the
invite email step needs it).

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

Not yet built: packages/payment/approval, partner login, referral
attribution + tier-aware checkout pricing, the partner dashboard, admin
partner/territory management, and territory visualization (see the repo's
task list, "Reseller P1-C" through "P1-H").

## Reseller Portal Part 1, Phase B (public partner application)

`migrations/0005_partner_application_fields.sql` corrects a design gap
found while building the actual form: Phase A's `apply_for_partner()` was
written expecting a live `territory_id` picked from the `territories`
table, but no territories exist yet (that's an admin-side planning
concept, built later in Phase G) and there's no UI yet to create them
either. Spec Part 1 §16 actually lists Region/City/Barangay as plain
applicant-provided fields - the same shape as an order's delivery address
- not a live-linked picker; formal territory assignment + capacity
checking happens later, at admin approval (spec §18-19). This migration
adds plain-text `region`/`city`/`barangay` columns to `partners` and
recreates `apply_for_partner()` with the corrected parameter list. Safe:
the function had never been called from production.

`/reseller` is now a real application form (previously a static holding
page): partner type selector (Reseller/Distributor/Franchise - the CTA
still says "Become a Reseller" per spec §15, but the applicant can pick
any type), full name, email, mobile, address, region, city, barangay,
client-side validated (`src/lib/validation.ts`,
`validatePartnerApplication`), submitted through `apply_for_partner()`
(`src/lib/partners.ts`). On success shows a confirmation screen explaining
that package selection and payment come next (not built yet - Phase C).

Verified interactively (mocked `submitPartnerApplication`, reverted before
this commit): submitting an empty form surfaces all 7 required-field
errors and blocks submission; a fully filled-out Distributor application
submits successfully and the confirmation screen correctly reflects the
selected partner type.

Not yet built: packages/payment/approval, partner login, referral
attribution + tier-aware checkout pricing, the partner dashboard, admin
partner/territory management, and territory visualization (see the repo's
task list, "Reseller P1-C" through "P1-H").

## Reseller Portal Part 1, Phase C (packages, payment, admin approval)

`migrations/0006_partner_packages_payment_approval.sql` adds package +
payment fields to the same `partners` row created at application time
(`package`, `package_boxes`, `package_amount`, `payment_method`,
`payment_reference`, `payment_proof_path`, `payment_amount`,
`payment_date`, `payment_status` - `payment_status` reuses the existing
`payment_status` enum from the retail order schema) plus three functions:

- `submit_partner_package_payment(...)` - anon-callable, like
  `apply_for_partner`. Attaches package + payment info to an existing
  partner row and sets `payment_status = 'pending_verification'`. Blocked
  once the partner's `status` is no longer `'pending'`, so it can't be used
  to tamper with an already-decided application or someone else's payment
  fields via a guessed id.
- `generate_referral_code(full_name)` - first word of the name, uppercased,
  alphanumeric only, with a numeric suffix appended on collision
  (`JUAN` → `JUAN1` → `JUAN2` ...). Called from `approve_partner`, not
  exposed directly.
- `approve_partner(partner_id)` - admin-only (checked via `is_admin()`).
  Verifies the payment and activates the partner in one action: generates
  the referral code, sets `status = 'active'`, `payment_status = 'paid'`,
  `activated_at = now()`. Combines payment verification and application
  approval into a single step for this phase's scope, unlike retail
  orders' independent order/payment axes - the spec presents partner
  onboarding as one linear pipeline (Payment → Verification → Approved →
  Activated). Deliberately does **not** touch `territory_id` - no
  territories exist yet and there's no admin UI to create/assign them
  (Phase G); territory assignment + capacity checking stay deferred to
  that phase.

Package price is computed client-side via the same `calculatePartnerPrice`
pricing engine admin/website already use (SRP × partner tier discount ×
box count - `src/lib/partners.ts`'s `fetchPartnerPackage`), never a
separately hardcoded number.

`/reseller` is now a 3-step flow: application (Phase B, unchanged) →
package summary + payment (box count/price/total, payment method picker
reusing `PaymentMethodSelect` filtered to manual methods only - a package
payment is a one-time upfront investment, not a delivery order, so COD is
excluded - and the same `ProofUpload` component checkout uses) →
confirmation. New admin pages `/admin/partners` (list, filterable by
status/type, flags pending payment review) and `/admin/partners/:id`
(applicant details, unified package/payment panel with signed-URL proof
image, Approve/Reject actions) - both wired into `AdminLayout`'s nav.

Verified locally end-to-end against a throwaway Postgres instance with the
full migration chain applied (schema.sql + 0002-0006): applied as an
anonymous role, submitted package payment, confirmed the resubmission
guard rejects a second `submit_partner_package_payment` call once the
partner is no longer `pending`, confirmed a non-admin authenticated user
is rejected by `approve_partner`'s `is_admin()` check, confirmed an admin
successfully approves and gets back a generated referral code, and
confirmed the collision suffix (`JUAN` → `JUAN1`) on a second same-first-
name applicant. Also verified interactively in the browser (mocked
Supabase client + bypassed route auth, reverted before this commit): the
full application → package → payment submission flow, and the admin
list/detail/approve flow with a pre-seeded pending partner.

Not yet built: partner login/referral identity, referral attribution +
tier-aware checkout pricing, the partner dashboard, admin territory
management, and territory visualization (see the repo's task list,
"Reseller P1-D" through "P1-H"). Partner-facing emails (application
received, payment approved) are also not wired yet - the existing
`notify.ts`/Resend Edge Function path is order-specific; a partner
equivalent is future work.

## RLS retrofit: `authenticated` no longer means admin

`migrations/0007_retrofit_admin_only_rls.sql` closes a gap flagged (but
deliberately not fixed) in migration 0004's header comment. Every "admin
full access" policy written before 0004 - `orders`, `payments`,
`order_status_history`, `payment_status_history`, `products`,
`promotions`, `partner_pricing_tiers`, `audit_log`, `media_assets`,
`media_asset_history`, plus the storage policy `admin can read payment
proofs` - was granted `to authenticated using (true)`. That was safe only
because the single admin account was the sole `authenticated` user in the
system. Once Reseller Phase D ships partner logins, partners become
`authenticated` Supabase users too, and every one of those policies would
have let any partner read/write every order, payment, product, promotion,
and audit log row, and read every customer's payment proof.

0007 uses `alter policy ... using (is_admin()) with check (is_admin())` to
tighten all of the above to the same `admin_users` membership check
migration 0004 introduced for the newer tables (`territories`, `partners`).
It intentionally leaves the *public*-read policies alone (`anyone can read
active products`, `anyone can read active promotions`, `anyone can read
media assets`) - those are meant to stay open to `anon`/`authenticated`
alike; only the admin-write/full-access policies were ever the gap.

This must ship before Phase D (partner auth) - a partner account existing
before this migration runs would have had admin-equivalent access to every
table above.

Verified locally against a throwaway Postgres instance with the full
migration chain applied (schema.sql + 0002-0007), a stubbed `auth.users`/
`auth.uid()` (via `request.jwt.claim.sub`), and `storage.objects`/
`storage.buckets`: seeded one `admin_users` row and one plain authenticated
("partner-like") user. As the partner: `select count(*) from orders`
returns 0 (previously would have returned every order), same for
`payments` and `audit_log`; an `update orders set status = ...` affects 0
rows; `select count(*) from storage.objects where bucket_id =
'payment-proofs'` returns 0. As the seeded admin, all of the above return
the real data. Public-read tables (`products`) still return rows for the
partner, confirming those policies were correctly left untouched.

## Reseller Portal Part 1, Phase D (partner auth + referral identity)

No new migration - the data model was already in place. `partners.user_id`
and the `"partner can read own record"` RLS policy (`user_id = auth.uid()`)
both shipped in migration 0004, ahead of need; this phase is what finally
uses them.

**`supabase/functions/invite-partner/index.ts`** (new Edge Function,
service-role, admin-only - checks `admin_users` membership directly since
Edge Functions run outside RLS): given `{ partnerId }` for an `active`
partner,
- if the partner has no `user_id` yet: calls
  `auth.admin.inviteUserByEmail(partner.email, { redirectTo:
  SITE_URL/reseller/set-password })`, which creates the Supabase Auth user
  and sends Supabase's own invite email, then links the new user's id back
  onto `partners.user_id`.
- if `user_id` is already set (partner already invited once): calls
  `auth.resetPasswordForEmail` instead - re-inviting an existing user
  errors ("already registered"), so "resend access" for an existing login
  goes through ordinary password recovery, landing on the same
  set-password page.

**Client wiring:** `approvePartner()` (`src/lib/adminPartners.ts`) now
calls the invite function immediately after `approve_partner()` succeeds -
best-effort, same pattern as its audit-log write: approval isn't rolled
back if the invite email fails, the failure is just surfaced in the
admin's toast so they can retry. `/admin/partners/:id` also exposes a
standalone "Resend Portal Invite" / "Resend Password Reset" button (label
depends on whether `user_id` is already linked) for after the fact.

**Partner-side pages** (all new):
- `/reseller/login` - email/password sign-in + "Forgot password" (calls
  `resetPasswordForEmail`, same redirect target as the invite).
- `/reseller/set-password` - the landing page for both the invite link and
  the password-reset link. Both are Supabase magic links that redirect
  here with a session already encoded in the URL hash; supabase-js
  auto-detects and establishes that session on load (`detectSessionInUrl`,
  on by default), so this page just waits for `useAuth()`'s session to
  appear, then calls `auth.updateUser({ password })`.
- `/reseller/dashboard` - gated by the new `RequirePartnerAuth` +
  `PartnerAuthProvider` (`src/components/reseller/`), which resolve the
  session to its `partners` row (`fetchMyPartner()` in `src/lib/partners.ts`,
  explicitly filtered by `user_id` rather than trusting RLS alone - an
  admin session also passes the "own record" policy's OR'd admin branch,
  so an unfiltered query could return more than one row). Shows the
  partner's name/type/status, their referral code, referral URL, and a
  client-generated QR code (`qrcode` npm package, `QRCode.toDataURL`,
  brand-colored) for that URL. **Deliberately scoped to referral identity
  and account summary only** - orders, earnings, and downline (spec §40's
  full dashboard) are Phase F; the page says so inline.
- Referral URL format is `{origin}/?ref={code}` (`buildReferralUrl` in
  `src/lib/partners.ts`) - a query param, not the spec's cosmetic
  path-style example (`leanandfit.ph/maria`). A per-partner path would
  collide with the app's fixed routes and need its own slug-routing layer;
  `?ref=` is the standard affiliate-link pattern and is what Phase E's
  checkout attribution capture will read off `window.location`.

**Security fix bundled into this phase:** `RequireAuth` (the `/admin`
route guard) previously only checked "is there a session" - correct while
the admin was the only authenticated user, wrong the instant partner
logins exist, since a signed-in partner would pass it too (and land on a
now RLS-empty but still-rendered admin UI, per the 0007 retrofit above).
It now also calls `is_admin()` and, if the session isn't an admin, shows a
"Not An Admin Account" screen with the exact `insert into admin_users`
statement to fix it - rather than a silent redirect loop - since this
could just as easily be the real admin's `admin_users` row missing after
a fresh migration run. The generic session provider also moved from
`components/admin/AuthProvider.tsx` to `components/auth/AuthProvider.tsx`,
since it's no longer admin-only - `RequirePartnerAuth`/`PartnerAuthProvider`
use the same one.

Verified interactively (mocked Supabase client covering
`auth.signInWithPassword`/`getSession`/`onAuthStateChange`/`rpc('is_admin')`
and a `partners` table keyed by `user_id`; bypassed the real Edge Function
since it's Deno-only; reverted before this commit): a plain authenticated
non-admin user is blocked at `/admin` with the fix-it message and no admin
UI leaks through; a real admin (`is_admin` true) passes through
unaffected; signing in as an active partner lands on the dashboard showing
their name, referral code, the correct `?ref=` URL (read from the actual
readonly input's value), and a rendered QR image; navigating to
`/reseller/dashboard` with no session redirects to `/reseller/login`; a
partner whose application is still `pending` sees "Portal Access
Unavailable" instead of the dashboard.

Not yet built: referral attribution during checkout, tier-aware partner
pricing on orders, and the earnings/order/downline sections of the
dashboard (Phase E/F) - see the repo's task list, "Reseller P1-E" and
"P1-F".

## Reseller Portal Part 1, Phase E (order routing, partner pricing, earnings)

**Bug fix found and shipped in this migration:** `partner_pricing_tiers`
has had no anon-read policy since it was created in migration 0002
("partner pricing is not retail-facing" - true at the time, before
`/reseller` existed). But Phase C's public package-payment step
(`fetchPartnerPackage` in `src/lib/partners.ts`) already reads this table
as `anon` to price an applicant's package - under RLS that select silently
returned zero rows (not an error), `calculatePartnerPrice()` fell back to
a 0% discount, and **every partner applicant has been quoted/charged full
SRP instead of their tier price since Phase C shipped**, on the live
project. `migrations/0008_referral_attribution_earnings.sql` adds
`"anyone can read partner pricing tiers"` (`for select to anon,
authenticated using (true)`) to fix this - tier discount percentages
aren't sensitive, same reasoning as the public product/promotion read
policies. **Action needed:** re-run migration 0008 on the live project;
there's nothing to backfill (no completed/approved applications during
the bug window per the current partner list), but any partner who
submitted a package payment before this fix should have their package
amount reviewed against their actual tier discount before approval.

**`create_order_with_payment()`** (schema.sql's checkout RPC) gains one
new optional trailing param, `p_referral_code` - existing callers that
omit it are unaffected. The old 20-param signature is explicitly dropped
first (same reason migration 0005 dropped `apply_for_partner`'s old
signature - otherwise `create or replace` leaves it as a second, dead,
still-callable overload with the pre-referral logic). When a code is
given:
- Resolves it against `partners` (`upper(referral_code) = upper(trim(...))`,
  `status = 'active'` only) - an unknown/inactive/expired code is silently
  ignored, checkout still succeeds, just unattributed.
- On a match, snapshots `referral_partner_id`, `referral_partner_type`,
  `referral_parent_partner_id`, `referral_territory_id` onto the new order
  (spec §54-55: historical integrity - these are copied at order time, not
  live-joined later, so they stay correct even if the partner's territory
  or parent later changes).
- Computes `partner_price` (the referring partner's tier price, from the
  same active product + `partner_pricing_tiers` the retail price came
  from) and `partner_earnings` = `greatest(0, (customer's actual unit
  price - partner_price) * quantity)` - spec §26-27/§34's worked examples.
  Clamped at 0 so a promo that undercuts the partner's tier price can't
  produce a negative "earning."

**Computed server-side, not client-supplied**, unlike `unit_price`/`total`
(already client-trusted for the customer's own retail price, lower
stakes): `partner_earnings` feeds a partner's future payout, so a tampered
anon RPC call can't inflate it - the RPC looks up SRP and the tier
discount itself at insert time.

**Client wiring:**
- `src/lib/referral.ts` - `captureReferralFromUrl()` reads `?ref=CODE`
  from the URL into `localStorage` (spec §26: "must persist through
  website browsing, product viewing, checkout, payment, order creation").
  Called on every route change from `App.tsx`'s `PixelInit`, since a
  referral link can land anywhere, not just `/`. No expiry/validation
  client-side - last code seen wins until overwritten or replaced by a
  real order attribution server-side; validation happens once,
  authoritatively, in the RPC above.
- `Checkout.tsx` reads `getStoredReferralCode()` and passes it through
  `createOrder()` as `p_referral_code`.
- `/admin/orders/:id` shows a new "Referral Attribution" section (partner
  name, type, code, partner price, partner earnings) when an order has one
  - read-only, no new admin actions yet.

**Deliberately not built this phase** (see the spec's own §32-39, but note
the document's own header already defers "dropship vs partner-fulfilled
order visibility" to the Part 2 addendum): fulfillment routing to an
upstream partner, manual-fulfillment vs. dropship selection, and
partner-to-partner restock purchases with their own earnings chain
(spec §28-29's distributor/franchise scenarios - a different transaction
than a retail order, with no purchase flow built for it at all). Every
order is still fulfilled by Lean & Fit admin exactly as before; this phase
only adds attribution + earnings data, not a second fulfillment path.
Partner-facing order/earnings visibility (spec §41-44) is Phase F.

Verified: the RPC changes against a throwaway Postgres instance with the
full migration chain applied (schema.sql + 0002-0008) - confirmed anon can
now read `partner_pricing_tiers` (previously 0 rows, now 3); a valid
referral code correctly attributes the order and computes
`partner_price`/`partner_earnings` (reseller, 20% tier, SRP 250, qty 2 ->
`partner_price` 200.00, `partner_earnings` 100.00); no code and an unknown
code both leave every referral column null and the order still succeeds;
a heavily-discounted order (paid less than the partner's tier price)
clamps earnings to 0.00 rather than going negative. Client wiring verified
interactively (mocked Supabase client, reverted before this commit):
`?ref=MARIA` on any route persists to `localStorage`; submitting checkout
sends `p_referral_code: 'MARIA'` through to the RPC call; `/admin/orders/:id`
for an order with a referral partner renders the attribution section with
the correct name, type, price, and earnings.
