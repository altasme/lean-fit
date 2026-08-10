# Lean & Fit Protein Coffee - Website MVP

Premium, CTR-focused product landing page with a manual-payment checkout
and order-verification backend, for Lean & Fit Protein Coffee (paid
social → landing page → checkout, no online payment gateway for MVP).

Full build spec: see the client CLAUDE.md this repo was built from (build
sequence, brand system, content rules, RLS design, conversion
instrumentation plan).

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
                 pricing, FAQ, payment details, and email copy. Nothing
                 product-related is hardcoded in components.
  components/
    layout/      Nav, Footer, StickyCTA, PublicLayout, Logo
    home/        the 11 homepage sections
    checkout/    order summary, delivery form, payment method, proof upload
    admin/       auth gate, layout, status controls
    ui/          shared primitives (buttons, badges, qty stepper, ...)
  pages/         route-level components (Home, Checkout, OrderConfirmed,
                 admin/*)
  store/         Zustand cart/checkout state
  lib/           supabase client, order creation, admin queries, Meta
                 Pixel helpers, validation, formatting, email notify
  types/         Order / OrderStatus types (mirrors the DB schema)
supabase/
  schema.sql     tables, RLS, storage bucket, create_order() RPC
  functions/     send-order-email, capi-purchase (Deno Edge Functions)
```

## ⛔ Blocked on client input before launch

The site is fully built and functional, but several product facts are
placeholders pending client sign-off (`src/content/product.ts` and
`src/content/payment.ts` are flagged inline with `⛔`):

1. **Delivery fee/coverage.** Base price is locked at ₱250. `PRODUCT.deliveryFee`
   is still `0` as a placeholder - client must confirm actual delivery
   pricing and coverage areas.
2. Confirm the 20g/soya "image 11" design is dead - all copy currently
   assumes 15g whey / `@leanfitcoffee`.
3. Final ingredient list + whether Senna Leaf Extract stays in the formula
   (changes "daily / anytime" usage framing if it does).
4. Approved final claims list (some claims on the source materials are
   unconfirmed medical/functional claims - currently framed as lifestyle
   claims by default).
5. Locked tagline (a default set is in place).
6. Real GCash + bank account details and GCash QR image
   (`src/content/payment.ts`).
7. Business notification inbox + who verifies payments
   (`BUSINESS_NOTIFICATION_EMAIL` secret).
8. Testimonials, FAQ answers. (Logo, hero, product, and lifestyle
   photography are now in from the client.)

## Conversion instrumentation

Meta Pixel fires `PageView`, `ViewContent` (product section in view),
`InitiateCheckout`, `AddPaymentInfo`, and `Purchase` (on order submission,
client-side, with `eventID = orderId` for future CAPI dedup) - see
`src/lib/pixel.ts`. Routing is real routed pages (not hash routes) so
Meta's URL-based custom conversions work. The `capi-purchase` Edge
Function is a scaffolded stub for phase 2 (server-side Purchase/
PaymentVerified event on admin "Payment Approved") - not wired into the
admin flow yet.

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

## Out of scope (MVP)

Online payment gateway, automated payment verification, card processing,
GCash/Maya API, customer accounts, subscriptions, loyalty, inventory,
courier API, marketplace integrations, advanced CRM/analytics,
coupon/promo engine.
