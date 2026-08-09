# Lean & Fit Protein Coffee — Website MVP

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

- `npm run dev` — local dev server
- `npm run build` — typecheck + production build
- `npm run typecheck` — TypeScript only
- `npm run lint` — ESLint

Backend setup (Supabase project, schema, Edge Functions, secrets): see
[`supabase/README.md`](./supabase/README.md).

## Project structure

```
src/
  content/       product.ts, faq.ts, payment.ts, emails.ts, site.ts
                 — single source of truth for all product facts, claims,
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

1. **Base price (PHP) + delivery fee/coverage.** `PRODUCT.price` is `null`
   until supplied — the Purchase section and checkout both detect this and
   block ordering ("Price Coming Soon") rather than guessing.
2. Confirm the 20g/soya "image 11" design is dead — all copy currently
   assumes 15g whey / `@leanfitcoffee`.
3. Final ingredient list + whether Senna Leaf Extract stays in the formula
   (changes "daily / anytime" usage framing if it does).
4. Approved final claims list (some claims on the source materials are
   unconfirmed medical/functional claims — currently framed as lifestyle
   claims by default).
5. Locked tagline (a default set is in place).
6. Real GCash + bank account details and GCash QR image
   (`src/content/payment.ts`).
7. Business notification inbox + who verifies payments
   (`BUSINESS_NOTIFICATION_EMAIL` secret).
8. Vector logo (a text-token placeholder wordmark is used for nav/favicon
   until supplied), final product photography, testimonials, FAQ answers.

## Conversion instrumentation

Meta Pixel fires `PageView`, `ViewContent` (product section in view),
`InitiateCheckout`, `AddPaymentInfo`, and `Purchase` (on order submission,
client-side, with `eventID = orderId` for future CAPI dedup) — see
`src/lib/pixel.ts`. Routing is real routed pages (not hash routes) so
Meta's URL-based custom conversions work. The `capi-purchase` Edge
Function is a scaffolded stub for phase 2 (server-side Purchase/
PaymentVerified event on admin "Payment Approved") — not wired into the
admin flow yet.

## Out of scope (MVP)

Online payment gateway, automated payment verification, card processing,
GCash/Maya API, customer accounts, subscriptions, loyalty, inventory,
courier API, marketplace integrations, advanced CRM/analytics,
coupon/promo engine.
