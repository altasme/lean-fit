# Lean & Fit Protein Coffee - Website MVP

Premium, CTR-focused product landing page with a manual-payment checkout
(GCash, Maya, Bank Transfer, Cash on Delivery) and order-verification
backend, for Lean & Fit Protein Coffee (paid social → landing page →
checkout). Payment is architected as `Order → Payment → Provider` so a
future PayMongo integration slots in as another provider without
rebuilding checkout, orders, or admin - see [`CLAUDE.md`](./CLAUDE.md) §6.

Full build spec: [`CLAUDE.md`](./CLAUDE.md) (build sequence, brand system,
content rules, payment architecture, RLS design, conversion
instrumentation plan). v2 supersedes the original v1 payment schema - see
CLAUDE.md §16 if you're trying to reconcile the two.

## Stack

React 18 + TypeScript + Vite · Tailwind CSS · Zustand · Supabase
(Postgres, Auth, Storage) · Resend (via Supabase Edge Functions) ·
Meta Pixel · Cloudflare Pages.

## Getting started

```bash
npm install
cp .env.example .env   # fill in Supabase + Pixel values
npm run dev
```

- `npm run dev` - local dev server
- `npm run build` - typecheck + production build
- `npm run typecheck` - TypeScript only
- `npm run lint` - ESLint

Backend setup (Supabase project, schema, Edge Functions, secrets): see
[`supabase/README.md`](./supabase/README.md).

## Project structure

```
src/
  content/       product.ts, faq.ts, payment.ts, emails.ts, site.ts
                 - single source of truth for all product facts, claims,
                 pricing, FAQ, payment methods (config-driven, CLAUDE.md
                 §6a), and email copy. Nothing product-related is
                 hardcoded in components.
  components/
    layout/      Nav, Footer, StickyCTA, PublicLayout, Logo, ScrollToTop
    home/        the 11 homepage sections
    checkout/    order summary, delivery form, payment method, proof upload
    admin/       auth gate, layout, status controls (order + payment)
    ui/          shared primitives (buttons, badges, qty stepper, ...)
  pages/         route-level components (Home, Checkout, OrderConfirmed,
                 admin/*)
  store/         Zustand cart/checkout state
  lib/           supabase client, order+payment creation, admin queries,
                 Meta Pixel helpers, validation, formatting, email notify
  types/         order.ts (fulfillment) + payment.ts (payment lifecycle) -
                 deliberately separate types mirroring the DB split, see
                 CLAUDE.md §6.8/§10
supabase/
  schema.sql     orders/payments/history tables, RLS, storage bucket,
                 create_order_with_payment() RPC
  functions/     send-order-email, capi-purchase (Deno Edge Functions)
```

## ⛔ Blocked on client input before launch

The site is fully built and functional, but several product facts are
placeholders pending client sign-off (`src/content/product.ts` and
`src/content/payment.ts` are flagged inline with `⛔`) - see CLAUDE.md §15
for the canonical list:

1. **Delivery fee/coverage.** `PRODUCT.deliveryFee` is still `0` as a
   placeholder - client must confirm actual delivery pricing and coverage
   areas. (Base price itself is no longer hardcoded here - it's the live
   `products.srp` row, admin-editable at `/admin/products`; see "Live
   product data" below.)
2. Confirm the 20g/soya "image 11" design is dead - all copy currently
   assumes 15g whey / `@leanfitcoffee`.
3. Final ingredient list + whether Senna Leaf Extract stays in the formula
   (changes "daily / anytime" usage framing if it does).
4. Approved final claims list (some claims on the source materials are
   unconfirmed medical/functional claims - currently framed as lifestyle
   claims by default).
5. Locked tagline (a default set is in place).
6. Real GCash, Maya, and bank account details + **GCash and Maya QR
   images** (`src/content/payment.ts`). Cash on Delivery needs no account
   details and is ready as-is.
7. Testimonials, and final client-approved FAQ answers (`src/content/faq.ts`
   now has an expanded placeholder set covering Product/Ordering while we
   wait on the client's copy). (Logo, hero, product, and lifestyle
   photography are now in from the client.)

Resolved: business notification inbox (`vanamaranto1@gmail.com`) and
sender identity (`realfitorders@altasme.com`, domain verified in Resend)
are set as Supabase Edge Function secrets - see
[`supabase/README.md`](./supabase/README.md). Cloudflare Pages env vars
and the `adminleanfit.altasme.com` custom domain are also live.

## Conversion instrumentation

Meta Pixel fires `PageView`, `ViewContent` (product section in view),
`InitiateCheckout`, `AddPaymentInfo`, and `Purchase` (on order submission -
manual or COD alike, client-side, with `eventID = orderId` for future CAPI
dedup) - see `src/lib/pixel.ts`. Routing is real routed pages (not hash
routes) so Meta's URL-based custom conversions work.

The `capi-purchase` Edge Function is a scaffolded stub for phase 2: a
server-side `Purchase` fired whenever `payment.status → paid` (verified
manual payment, COD collected, or a future gateway) - not wired into the
admin flow yet. Because payment is its own record independent of the
order, this one trigger point will cover every current and future payment
method without further checkout changes.

## Deploying to Cloudflare Pages

This repo builds as a static SPA (`npm run build` → `dist/`). `public/_redirects`
already routes all paths to `index.html` (required - the app uses real routed
pages per §1, not hash routes, and Pages needs an explicit SPA fallback rule or
`/checkout`, `/admin`, etc. 404 on direct load/refresh). `public/_headers` sets
baseline security headers.

1. **Connect the repo** - Cloudflare dashboard → Workers & Pages → Create →
   Pages → Connect to Git → select `altasme/lean-fit`.
2. **Build settings**:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
3. **Environment variables** (Pages project → Settings → Environment
   variables, for both Production and Preview): `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `VITE_META_PIXEL_ID`. These must exist *before*
   the first build that needs them, since Vite inlines `VITE_*` vars at
   build time.
4. **Custom domain** - Pages project → Custom domains → Add
   `leanfit.altasme.com`. If `altasme.com`'s DNS zone is already on this
   Cloudflare account, Pages adds the CNAME automatically; otherwise add
   `leanfit → <project>.pages.dev` as a CNAME manually in that zone.
5. Every push to `claude/lean-fit-project-spec-82vyqt` (or whichever branch
   is set as the production branch) triggers a new deploy; other branches
   get preview URLs.

Supabase/Resend/Meta secrets (§ above) are separate from Pages - they're
Supabase Edge Function secrets, not Cloudflare env vars, since they must
never reach the client bundle.

### Admin on its own subdomain

The admin app runs from this same deployment - no second Pages project,
no separate build. `src/lib/hostRouting.ts` detects any hostname starting
with `admin` at runtime and serves the order list at `/` instead of the
marketing homepage; every `/admin/*` path keeps working normally on the
main domain too, so this is purely additive.

To turn it on, add the extra custom domain on the **same** Pages project
(step 4 above, repeated) - no code change, no redeploy, no new env vars:
- Dev: `adminleanfit.altasme.com`
- Launch: `admin.<client-domain>` (domain TBD - client hasn't locked
  `.ph` vs `.com` yet, see CLAUDE.md §15)

A reseller portal (`rsleanfit.altasme.com` dev / `reseller.<client-domain>`
launch) is intentionally not built yet - Phase 2 only added the
`ref_code`/`reseller_id` stub columns on `orders` for future attribution
(CLAUDE.md §11/§13). When that panel gets built, the same pattern applies:
extend `ADMIN_HOST_PREFIXES`-style matching in `hostRouting.ts` for a
`reseller`/`rs` prefix and add the domain in Cloudflare - no new
deployment required.

## Out of scope (this launch)

Live PayMongo integration · PayMongo API implementation · automated
payment gateway processing · automated payment reconciliation ·
automated refunds/payouts · customer accounts · subscriptions · loyalty ·
inventory · courier API · Shopee/Lazada/TikTok Shop · advanced
CRM/analytics · coupon/promo engine.

**Included:** manual GCash/Maya/Bank Transfer, Cash on Delivery, proof
upload, admin verification, two-axis payment/order status management,
and a payment-provider-ready architecture (tables, `provider` field,
status abstraction) so PayMongo can be added later as config, not a
rebuild - see CLAUDE.md §13 for the hard build-scope rule this follows.
