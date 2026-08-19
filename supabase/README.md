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
10. Run `migrations/0004` through `0011` in the SQL editor, in order (see
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
11. Deploy the partner-portal invite function:
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

    **Superseded, see step 15 below:** `invite-partner` was later renamed
    to `grant-portal-access` and no longer uses an invite-link flow at
    all (admin sets the password directly instead) - `SITE_URL` is not
    needed by the current function. This step is kept only as history for
    anyone reading the migration log in order; skip straight to step 15
    on a fresh setup.
12. Run `supabase/migrations/0012_ph_territory_data.sql` in the SQL editor,
    after 0011, **in two separate paste-and-run steps** (the file itself is
    clearly divided into "STEP 1 OF 2" / "STEP 2 OF 2" - follow those
    markers):
    - **Step 1**: select and run *only* the `alter type territory_level add
      value if not exists 'province';` line by itself, and let it finish.
      (`if not exists` makes this safe to re-run - if you've already added
      the value in an earlier attempt, this is a harmless no-op instead of
      an `enum label "province" already exists` error.)
    - **Step 2**: once that's done, select and run everything below it.

    This split is required, not optional - Postgres refuses to use a
    brand-new enum value in the same transaction that added it
    (`unsafe use of new value... New enum values must be committed before
    they can be used`), and the SQL editor runs a whole pasted script as
    one transaction. Pasting the entire file in one go will fail with that
    exact error every time. If you hit it, nothing was left half-applied -
    the whole transaction (including the `alter type`) rolls back cleanly,
    so just retry with the two-step split.

    This migration seeds the real PSGC region/province/city hierarchy
    (~1,750 rows) that the public application form and partner-assisted
    onboarding now use for live, capacity-checked location pickers, adds
    `province` as a real (never partner-assignable) `territories` level,
    and adds the barangay lazy-creation/containment RPCs the new pickers
    call. No Edge Function or secret involved - just SQL. The two bundled
    JSON files it pairs with client-side (`public/data/ph-locations.json`,
    `public/data/ph-barangays.json`) are already committed to the repo and
    ship with the normal frontend deploy, nothing extra to upload.
13. Deploy the partner package-payment confirmation email function:
    ```bash
    supabase functions deploy send-partner-email
    ```
    Reuses the same `RESEND_API_KEY`/`EMAIL_FROM` secrets already set in
    step 5 - nothing new to configure. Fired right after a partner submits
    their package payment (Route A or Route B), tells them their payment is
    being reviewed and that portal login details follow separately once
    approved (the actual login email is `grant-portal-access`, step 16).
14. Run `supabase/migrations/0013_fix_assign_partner_territory.sql` in the
    SQL editor, after 0012 (single paste, no enum split needed - this one
    doesn't touch the enum). Fixes two bugs in admin's territory
    reassignment (Partner Detail → Territory & Hierarchy) found and
    confirmed by reproduction while auditing this session's changes
    against the admin panel, both caused by migration 0012 adding
    `province` as a real `territories` level:
    - A partner could previously be silently assigned to a **province**-
      level territory (never valid - only region/city/barangay are
      partner-assignable) because the function's level→partner-type
      `case` had no `else`, so an unrecognized level compared as NULL
      instead of failing. Now rejected explicitly.
    - Reassigning a partner's territory only ever updated `territory_id`,
      never the human-readable `region`/`city`/`barangay` columns the
      admin panel actually displays (Partners list, Partner Detail) - so
      they went stale the moment admin reassigned someone. Now synced via
      `describe_territory_chain()` on every reassignment, same as
      application-time.
15. Run `supabase/migrations/0014_admin_restructure_leads_rbac.sql` in the
    SQL editor, after 0013 (single paste, no enum split needed). Adds
    `is_full_admin()` and tightens `products`/`promotions`/
    `partner_pricing_tiers` RLS to it (staff accounts can no longer write
    those tables), makes `partners.partner_type` nullable so the public
    lead form can create a bare lead row, adds `partners.province`, and
    replaces `apply_for_partner()` with `submit_partner_lead()` (anon,
    lead capture only) and `admin_create_partner()` (authenticated admin,
    full manual partner creation - also completes a lead in place via
    `p_existing_partner_id` instead of leaving it stuck pending).
16. Deploy `grant-portal-access`, which **replaces** `invite-partner`
    (step 11 above is obsolete - delete the old `invite-partner` function
    from the project once this is deployed, Supabase does not do this
    automatically on a rename):
    ```bash
    supabase functions deploy grant-portal-access
    ```
    No `SITE_URL` secret needed - it reuses the `RESEND_API_KEY`/
    `EMAIL_FROM` secrets already set in step 5. Admin sets the
    partner/staff password directly (`mode: 'partner'` or `mode: 'staff'`)
    and the credentials are emailed to them; there is no invite link and
    nothing to add under Authentication → URL Configuration.

**Status for the live project:** schema applied, `RESEND_API_KEY`,
`BUSINESS_NOTIFICATION_EMAIL` (`vanamaranto1@gmail.com`), and `EMAIL_FROM`
are set. `META_CAPI_TOKEN`/`META_PIXEL_ID` remain unset (phase 2,
not required for MVP launch). Migrations 0002-0013 have all been applied
(0008-0011 confirmed run - 0008 fixes a real pricing bug: `partner_pricing_tiers`
had no anon-read policy, so every partner package was quoted at full SRP
with 0% tier discount until this ran; 0009 is pure RLS for the partner
dashboard; 0010 adds the territory/partner-assignment RPCs for the admin
panel; 0011 adds partner-assisted onboarding; 0012's two-step seed +
RPCs and 0013's `assign_partner_territory` fixes are both confirmed run).
`invite-partner` and `send-partner-email` are confirmed deployed from the
earlier setup.

**Still pending on the live project - domain lock (this update):** the
domains are now finalized as `leanandfit.ph` / `admin.leanandfit.ph` /
`partner.leanandfit.ph` (see root `README.md` → "Deploying to Cloudflare
Pages"). Three follow-ups this creates, none done yet:
- Add the `admin.leanandfit.ph` and `partner.leanandfit.ph` custom domains
  to the Cloudflare Pages project (the `admin.leanandfit.ph` custom domain
  from the prior interim domain must be re-added under the new zone -
  DNS doesn't carry over automatically between domains).
- Verify a `leanandfit.ph` sending domain in Resend, then update the
  `EMAIL_FROM` secret to match (`supabase secrets set EMAIL_FROM="Lean &
  Fit <orders@leanandfit.ph>"`) - the interim sender identity
  (`realfitorders@altasme.com`) still works but should be retired once
  the new domain is verified.
- **Still not deployed at all:** migration 0014 and the renamed
  `grant-portal-access` function (steps 15-16 above) - this is the whole
  admin-restructure/RBAC/lead-funnel change from the prior session, not
  yet pushed to the live Supabase project.

Historical note (kept for context, now fully superseded by
`grant-portal-access` above): `invite-partner` was initially deployed
with no `SITE_URL` secret set, which was the confirmed cause of "Approve
Partner"/"Resend Portal Invite" failing to send any email - purely a
deployment/config gap, not a code bug. That whole invite-link mechanism
(and the `SITE_URL` secret it needed) no longer exists in the current
codebase; there is nothing left to configure for it.

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

## Reseller Portal Part 1, Phase F (partner dashboard)

`migrations/0009_partner_dashboard_visibility.sql` is pure RLS - no new
tables/columns. Partners could log in since Phase D, but had no read
access to `orders`, `payments`, or each other's `partners` rows at all;
this grants exactly the dashboard's read scope:
- `orders`/`payments`: a partner can read orders they referred
  (`referral_partner_id`) or placed themselves (`email` match, so a
  self-checkout that didn't go through their own referral link still
  shows up), and the payment on any order they can see.
- `partners`: a partner can additionally read their direct parent and
  direct downstream partners (spec §46's "Parent Distributor/Franchise" /
  downstream sections) - on top of the "own record" policy from migration
  0004.

**Bug caught and fixed while writing this migration:** a naive
`using (... in (select id from partners where user_id = auth.uid()) ...)`
subquery inside a policy *on `partners` itself* throws "infinite
recursion detected in policy for relation" - confirmed locally, not a
hypothetical. Same issue would have hit `orders`/`payments` policies
indirectly (their subqueries also touch `partners`, whose own policies
then re-evaluate). Fixed with three `SECURITY DEFINER` helper functions
(`my_partner_id()`, `my_partner_email()`, `my_parent_partner_id()`) - same
pattern as `is_admin()` in migration 0004: running as the function owner
bypasses RLS for that one internal lookup instead of re-triggering policy
evaluation.

**`src/lib/partnerOrders.ts`** (new): `fetchPartnerVisibleOrders()` - one
fetch (orders + payments, RLS already scopes it to the signed-in
partner), then pure functions derive every dashboard view from that same
list, same "single fetch, derive views in TS" pattern as
`fetchActiveProduct()`:
- `splitPartnerOrders()` - spec §41 vs §42: "Client Orders" (referred to
  this partner, customer isn't the partner) vs "My Orders" (email matches
  the partner's own account) - an order the partner placed through their
  OWN referral link resolves as "my own purchase," not a referred
  customer.
- `summarizePartnerCustomers()` - spec §43, aggregated from Client Orders
  only (order count, total spend, most recent order date). "Referral
  relationship" is always "Direct" - there's no multi-hop chain tracked,
  a customer is attributed to exactly the one partner whose link they
  used (migration 0008).
- `summarizePartnerEarnings()` / `earningsStatusForOrder()` - spec §44.
  No separate earnings/payout table exists (CLAUDE.md §13 rules out
  automated payouts), so status is derived from the order + payment
  instead: payment `paid` -> **Payable** (ready for Lean & Fit's external,
  manual payout process - not "already paid out," there's nothing here
  tracking that distinction); order `cancelled` or payment
  `refunded`/`cancelled`/`rejected`/`failed` -> **Void** (no earning
  actually due); anything else -> **Pending**. This collapses spec §44's
  "Pending/Approved/Paid" into two real buckets (Payable/Pending) plus
  Void, rather than inventing an "Approved" state nothing in the system
  sets.

**`src/lib/partners.ts`** gains `fetchDownstreamPartners()` and
`fetchParentPartner()`. Both will return nothing for every partner today
- nothing currently sets `parent_partner_id` (no admin UI exists yet,
that's Phase G) - which is correct, not broken; the RLS + UI are built
ahead of the data existing, same as `territory_id` has been since Phase A.

**`/reseller/dashboard`** is now tabbed (spec §40's dashboard menu, client-
side tab switching, one fetch): Overview (Phase D's referral identity +
account summary, now also showing Parent Partner / downstream partners),
Client Orders, My Orders, Customers, Commission, and Marketing Materials
(spec §45 - a Drive link, `RESELLER.marketingMaterialsUrl` in
`content/site.ts`, same admin-editable-by-code pattern as everything else
not yet DB-backed). Client Orders deliberately has no ACCEPT/MARK AS
FULFILLED actions from spec §41's example - there's no partner-run
fulfillment path built (Phase E: every order is still fulfilled by Lean &
Fit admin), so it's read-only status visibility, not an action queue. My
Orders is labeled honestly: partner tier pricing isn't applied to
self-checkout (no "buy at my price" flow exists, only the one-time
package purchase from application), so it shows whatever retail/promo
price was actually charged, not a discounted "partner price."

Verified the RLS against a throwaway Postgres instance with the full
migration chain applied (schema.sql + 0002-0009) using a 3-level seeded
hierarchy (Ana Franchise -> Juan Distributor -> Maria Reseller): Maria
sees herself + Juan (not grandparent Ana); Juan sees himself + Ana (parent)
+ Maria (downstream); Ana sees herself + Juan (not grandchild Maria).
For orders: seeded a Maria-referred order, a Maria self-checkout order,
and an unrelated third-party order - Maria's visible order/payment set
was exactly the first two, confirming both the referral and email-match
branches and that the unrelated order stays invisible. Client UI verified
interactively (mocked Supabase client, reverted before this commit): all
six tabs render with correctly split/aggregated data - Client Orders
excludes the self-checkout order, My Orders shows only it, Customers
lists the two referred customers, and Commission shows the right
Total/Payable/Pending split (a paid order's earnings counted as Payable,
a pending-verification order's as Pending).

## Reseller Portal Part 1, Phase G (admin partner + territory management)

`migrations/0010_admin_territory_partner_management.sql` adds two RPCs,
not a new table - territory CRUD itself (create/edit/delete regions,
cities, barangays; set capacity) needs no RPC at all, since admin already
has full table access to `territories` via `is_admin()` (migration 0004),
same direct-table-access pattern `AdminProducts.tsx`/`adminProducts.ts`
already use. Only the two operations with a real invariant to enforce get
RPCs, same reasoning as `approve_partner()`:

- `assign_partner_territory(partner_id, territory_id)` - validates spec
  §7/§9's strict level<->partner_type mapping (franchise/region,
  distributor/city, reseller/barangay - already encoded client-side as
  `TERRITORY_LEVEL_PARTNER_TYPE` since Phase A) and spec §58's "system
  prevents unauthorized over-allocation" capacity check (counts only
  `active` partners at that territory, so a suspended partner doesn't
  hold a slot hostage).
- `reactivate_partner(partner_id)` - re-checks that same capacity before
  undoing a suspension, since another partner may have taken the slot
  while this one was suspended.

Suspending needs no RPC - setting `status = 'suspended'` never violates
anything (it's the direction that *frees* a territory slot, only
`active` partners count toward capacity), so it's a plain client update,
same as `rejectPartner()`. Parent-partner assignment is also a plain
client update (`assignParentPartner()` in `src/lib/adminPartners.ts`) -
admin manually picks from a filtered list of eligible upstream partners
(`fetchEligibleParentPartners()`: a reseller's list includes both active
distributors AND franchises, so admin can apply spec §23's "missing
partner" rule by hand - skip to franchise when no distributor covers the
area - rather than an automated cascade nothing in Part 1 needs yet).

**Bug caught and fixed while validating this migration locally:**
`returns table (partner_id uuid, territory_id uuid)` on
`assign_partner_territory()` creates PL/pgSQL output variables named
`partner_id`/`territory_id` - and `partners.territory_id` referenced
unqualified anywhere inside that function's body then throws "column
reference is ambiguous" (it doesn't know whether you mean the table
column or the output variable). Same issue hit `reactivate_partner()`'s
`status` output column. Fixed by qualifying every such reference as
`partners.territory_id`/`partners.status` etc. throughout both functions,
confirmed by rerunning every test case afterward.

**`src/lib/adminTerritories.ts`** (new): `listTerritories()` computes
occupancy live (count of `active` partners per territory) rather than a
stored counter, so it can never drift out of sync with suspensions/
reassignments; `createTerritory()`/`updateTerritoryCapacity()`/
`deleteTerritory()` are plain CRUD, with `deleteTerritory()` translating
the FK-violation Postgres throws (territories are protected from deletion
by both child territories and assigned partners, no `ON DELETE CASCADE`)
into a readable message instead of a raw constraint string.

**`/admin/territories`** (new page): add/list territories by level
(Region/City/Barangay), inline capacity editing, live Available/Occupied/
Full status, delete. Deliberately a flat table, not a map - see the
Phase H scoping note below; this phase is data management, not
visualization.

**`/admin/partners/:id`** gains a "Territory & Hierarchy" section
(shown once a partner is `active` or `suspended`, i.e. past application):
a dropdown of that partner type's matching-level territories (capacity-
full options disabled), a parent-partner dropdown, and Suspend/Reactivate
buttons swapping based on current status.

**Not built** (deliberately, out of Part 1 Phase G's scope - real gaps,
documented rather than silent): live territory-availability checking
during the *public* application form (spec §19) - applicants still submit
free-text region/city/barangay (Phase B) rather than picking a real
`territories` row with live capacity; automatic "missing partner"
upstream routing (spec §23-24) - admin applies it by hand via the
eligible-parents dropdown above, not an automated cascade.

Verified locally against a throwaway Postgres instance with the full
migration chain applied (schema.sql + 0002-0010): seeded a region -> city
(capacity 1) -> barangay hierarchy with one distributor already occupying
the city. Confirmed - assigning a second distributor to the same city
fails with the exact capacity message; assigning a reseller to a city-
level territory fails with the level-mismatch message; a non-admin caller
is rejected; suspending the first distributor frees the slot so the
second assignment then succeeds; reactivating the first (now-displaced)
distributor correctly fails ("territory now at capacity") until the
second is suspended, then succeeds. Client UI verified interactively
(mocked Supabase client, reverted before this commit): the territories
page renders the seeded hierarchy with correct Full/Available status,
creates a new region live; the partner detail page's territory dropdown
disables full options, assigning a territory/parent partner and
suspending/reactivating all update the UI correctly - also caught and
fixed a real pluralization bug ("City / Municipalitys" as a section
heading) during this pass.

## Reseller Portal Part 1, Phase H (territory visualization) - Part 1 complete

No migration - this phase is read-only, built entirely on tables and RLS
that already existed (`territories`, `partners`, both admin-readable
since migration 0004/0007).

**Scoping decision, flagged from the start of Reseller Portal work and
followed through here:** spec Part 1 §12-14 asks for "an interactive map
of the Philippines" with zoom/pan/region-city-barangay selection. This is
built as a **coverage tree/list**, not a literal geographic map -
rendering an accurate Philippines map down to barangay boundaries needs
real GeoJSON boundary data (region/city/barangay polygons), which doesn't
exist anywhere in this project and wasn't provided. A schematic
placeholder map (e.g. a grid of boxes standing in for provinces) would
look like a map while actually misrepresenting real geography, which is
worse than not having one - a tree conveys the exact same information
spec §12's "map objective" list asks for (franchise/distributor/reseller
coverage, vacant territories, capacity, occupied territories, partner
density) without the false precision.

**`src/lib/adminTerritoryMap.ts`** (new): `fetchTerritoryTree()` builds
the full region -> city -> barangay tree in one pass (two queries -
territories, and partners with a non-null `territory_id` - joined
client-side by `parent_id`), each node carrying its own occupant list
(name + status, not just a count - Phase G's `listTerritories()` only
needed a count for capacity math, this phase needs *who*).
`summarizeCoverage()` walks the tree for spec §59's strategic counts
(occupied/vacant per level). `findVacantTerritories()` lists every
territory with zero active occupants - "potential expansion areas" per
§59, the simplest correct reading of that requirement (no scoring/ranking
logic invented beyond "does anyone cover this yet").

**`/admin/territory-map`** (new page, `AdminTerritoryMap.tsx` +
`components/admin/TerritoryTreeNode.tsx`): three coverage-stat tiles
(Region/City/Barangay: occupied / total, vacant count), an expandable
tree (regions open by default, cities/barangays collapsed - click the
`▸`/`▾` to expand; each row shows the territory name, expected partner
type, occupied/capacity, a status badge - Full/Active Coverage/Available
- and the occupant(s) by name, linking to `/admin/partners/:id`, with a
non-active occupant's status shown in parenthesis), and a "Potential
Expansion Areas" list of every vacant territory with its parent for
context. Distinct from `/admin/territories` (Phase G, still the page for
adding territories and editing capacity) - this one is read-only,
strategic-overview-focused, cross-linked from its intro text.

Verified interactively (mocked Supabase client, reverted before this
commit) against a seeded 2-branch tree (NCR region occupied by a
franchise, with an occupied-and-full Marikina City / vacant Quezon City,
and under Marikina an occupied Concepcion Uno / vacant Malanday, plus a
second, fully vacant CALABARZON region): coverage tiles read the correct
occupied/total/vacant counts at every level; the tree renders each city
as a sibling of the other under its region (not nested under one
another) with correct indentation; occupant names/status render and link
correctly; the vacant/full status badges match each territory's actual
capacity state; the Potential Expansion list contains exactly the three
vacant territories with correct parent names.

**This closes out Reseller Portal Part 1** (Phases A through H).

## Reseller Portal Part 2 (partner-assisted onboarding, fulfillment method, Staff Admin groundwork)

See `docs/RESELLER_PORTAL_SPEC_PART2_ADDENDUM.md` - "Partner Onboarding,
Dropshipping & Order Visibility Addendum." Scoped down to what's
realistically buildable given this app's actual capabilities (confirmed
with the user before starting): partner-assisted onboarding with real
permission/territory enforcement, a `fulfillment_method` column for data-
model honesty, and groundwork-only Staff Admin support. Explicitly **not**
built: partner-run manual fulfillment/inventory tracking - there is no
inventory concept anywhere in this app, and building one wasn't part of
the agreed scope.

**Scope decision - the addendum's central "manual partner-fulfilled
order" concept (§12-18, §33) describes a sale that never touches the
Lean & Fit website at all:** the partner transacts with the customer
directly, off-platform (cash, chat, in person). Per §33, "partner-
fulfilled orders may be completely absent from the centralized order
system if that is the intended business process" - and since no partner
inventory/manual-fulfillment UI exists anywhere in this app, that is
exactly the path taken: every order that reaches
`create_order_with_payment()` is, by construction, a Lean & Fit dropship
order (the only fulfillment path that exists). `fulfillment_method` is
added for the data model's honesty/future-proofing (spec's own
"recommended field") with a fixed default - no UI toggle, since there's
no alternative to toggle to.

`migrations/0011_partner_assisted_onboarding.sql`:

- `orders.fulfillment_method` (`lean_and_fit_dropship` | `partner_fulfillment`),
  `not null default 'lean_and_fit_dropship'` - every existing/future order
  gets it automatically, `create_order_with_payment()` itself is untouched.
- `partners.onboarded_by_partner_id` (spec §8 "Onboarded By") - an
  immutable historical record of who sponsored a partner-assisted
  onboarding, kept deliberately separate from `parent_partner_id` (which
  Phase G's admin UI can reassign later without erasing who actually
  onboarded them).
- `admin_users.role` (`admin` | `staff_admin`) - groundwork only, per the
  spec's own framing ("the exact Staff Admin permission matrix will be
  defined in a future phase... do not hard-code every administrative
  account as having identical privileges"). No enforcement logic, no
  admin-user-management UI - every row still defaults to `'admin'`
  (unchanged behavior), `is_admin()` is untouched. Building the actual
  matrix now would mean inventing requirements the spec explicitly defers.
- `list_territories_with_occupancy(level)` - lets a partner's "Add
  Partner" form show real capacity-aware territory options. Territories
  are already public-readable, but a partner's own `partners` RLS
  visibility (migration 0009) doesn't extend to computing occupancy
  across arbitrary other partners - `SECURITY DEFINER` bypasses that for
  this one non-sensitive, read-only count.
- `onboard_partner(...)` - spec §1 Route B / §7-10: an authorized partner
  (Distributor or Franchise, never Reseller - §2-5) submits a new
  `pending` partner application on someone else's behalf, same shape as
  the public `apply_for_partner()` (Route A) but with real enforcement a
  free-text public form never needed:
  - **Permission matrix** (§2-5/§30/§34.2-4): Distributor → Reseller
    only; Franchise → Reseller or Distributor, never Franchise; Reseller →
    nobody.
  - **Territorial containment** (§28 "is the Distributor the appropriate
    territorial parent?"): a Distributor can only onboard into a barangay
    within their own city; a Franchise can only onboard into a city or
    barangay within their own region (checked by walking the selected
    territory's ancestor chain, not just its immediate parent, so a
    Franchise onboarding a Reseller two levels down is still confined to
    their region).
  - **Capacity** (§29): same `greatest(occupied, capacity)` check as
    Phase G's `assign_partner_territory()`, counting only `active`
    partners.
  - Auto-derives the free-text `region`/`city`/`barangay` display fields
    from the real selected territory, so existing UI ("Location" rows
    etc.) stays consistent regardless of which onboarding route created
    the row.
  - Sets `parent_partner_id = onboarded_by_partner_id` = the sponsoring
    partner - the natural reading of §8's own example and §30's tree
    structure.
  - Still gated on admin's normal `approve_partner()` review - onboarding
    doesn't bypass Lean & Fit's payment verification/approval step (§9),
    it only changes who initiates it.
- `approve_partner()` (unchanged signature, logic extended): now
  re-checks territory capacity if the partner already has a `territory_id`
  set (true for anything created via `onboard_partner()`, never true for
  Route A) - the slot was available when `onboard_partner()` checked it,
  but time passes before admin reviews, and someone else could fill it in
  the meantime. Same re-check pattern as Phase G's `reactivate_partner()`.

**Bug caught and fixed while writing this migration, before it ever
shipped:** the exact `returns table` output-variable-name collision found
in Phase G (`partner_id`/`territory_id`/`status` as OUT parameters
shadowing the identically-named table columns, causing "column reference
is ambiguous") would have hit `onboard_partner()` and the extended
`approve_partner()` too. Every column reference inside both functions is
qualified (`partners.territory_id`, `territories.capacity`, etc.) from
the start this time, confirmed by testing every branch afterward with no
recurrence.

**Client-side:**
- `src/components/reseller/PackagePaymentStep.tsx` (extracted from
  `Reseller.tsx`, now shared) - identical package/payment UI serves both
  the public application (Route A) and partner-assisted onboarding
  (Route B), parameterized heading/intro text so the copy reads correctly
  for "your application" vs. "you're sponsoring {name}."
- `/reseller/add-partner` (new page, `AddPartner.tsx`) - reachable via a
  "+ Add Partner" button on the dashboard Overview tab, shown only for
  Distributor/Franchise (`ONBOARDABLE_PARTNER_TYPES`). The territory
  dropdown is pre-filtered client-side to the sponsor's own coverage area
  (UX nicety - `onboard_partner()`'s server-side containment check is the
  actual enforcement) and disables full options, same pattern as Phase
  G's admin territory picker.
- `/admin/partners/:id` shows "Onboarded By" in the Applicant section
  ("Direct application" when null).
- `/admin/orders/:id` shows the order's `fulfillment_method` in the
  Product section (currently always "Lean & Fit Dropship," read from the
  real column rather than assumed).

Verified the RPC logic against a throwaway Postgres instance with the
full migration chain applied (schema.sql + 0002-0011), a 3-level seeded
hierarchy (Franchise Ana/NCR → Distributor Juan/Marikina City → Reseller
Maria/Concepcion Uno): a Reseller attempting to onboard anyone is
rejected; a Distributor attempting to onboard a Distributor is rejected;
a Franchise attempting to onboard a Franchise is rejected; a Distributor
onboarding into a barangay outside their own city is rejected; a
Franchise onboarding into a city outside their own region is rejected;
onboarding into an already-full barangay is rejected with the exact
capacity message; a valid onboarding succeeds with the correct derived
region/city/barangay names and `parent_partner_id`/`onboarded_by_partner_id`
both set to the sponsor; simulating a second partner filling the slot
before admin approval correctly blocks `approve_partner()` ("territory
now at capacity") until the slot is freed, then succeeds.
`list_territories_with_occupancy` returns correct per-territory counts as
a plain partner (not admin). Client UI verified interactively (mocked
Supabase client, reverted before this commit): a Distributor's Add
Partner form shows no type selector (only Reseller is onboardable) and
correctly excludes barangays outside their own city; a Franchise's form
offers both Reseller and Distributor, and switching the selected type
correctly re-fetches the matching territory level scoped to their own
region; a Reseller is shown the "can't onboard" message and the
dashboard's Add Partner link is hidden for them; submitting the form
calls `onboard_partner` with the correct type/territory and transitions
to the package step with sponsor-specific copy.

**Not built** (confirmed scope, see above): partner-run manual
fulfillment/inventory tracking (no `fulfillment_method` UI toggle - there
is no alternative to Lean & Fit dropship to toggle to); Staff Admin
permission enforcement (groundwork column only, per the spec's own
"future phase" framing); live territory-availability checking on the
*original public* `/reseller` application form (Route A - still
free-text, a Part 1 gap, parked per explicit instruction, unaffected by
this work); automated cross-level "missing partner" order routing for
retail checkout (§25-27 - Phase E's note that fulfillment routing isn't
built still applies; this phase's containment logic governs onboarding
placement only, not order routing).
