# CLAUDE.md — Lean & Fit Protein Coffee (Website)

> Claude Code build spec. Single source of instruction for the build.
> Client: Lean & Fit Protein Coffee. Builder: AltaSME / Nuvratech.
> One line: a premium, CTR-focused fitness product landing page with a manual-payment checkout and order-verification backend that turns paid social traffic into completed coffee orders.

**v2 · 2026-08-10** — Integrates Phase 2 payment architecture: `Order → Payment → Provider` separation, Maya (manual), COD branch, two-axis status (order vs payment), reseller-attribution hook, PayMongo-ready (**not built**). Supersedes the v1 payment schema. See §16 if v1 was already coded.

---

## 0. Prime directives

1. Build a **high-converting product landing page**, not a corporate site. Mobile-first (traffic is FB/IG/TikTok ads → this page). Every section pushes toward **Order Now**. The page carries 100% of the persuasion — no Messenger closer in this funnel — so conversion instrumentation is first-class, not an afterthought.
2. **Never hardcode product facts, claims, or prices in components.** They live in `src/content/product.ts` (§4). Client data isn't finalized; that file is the swap point.
3. **Manual payment now, gateway-ready architecture for later.** Build `Order → Payment → Provider` so PayMongo slots in as another provider without rebuilding checkout, orders, admin, or attribution. Prepare the structure — **do not** build PayMongo API code (§13).

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (brand tokens in config, §3) |
| State | Zustand (cart + checkout) |
| Backend | Supabase (Postgres, Auth for admin, Storage for payment proof) |
| Email | Resend |
| Hosting | Cloudflare Pages |
| Analytics | Meta Pixel (client) + Conversions API via Supabase Edge Function (phase 2) |

Routing: **real routed pages**, not hash/SPA-only — `/`, `/checkout`, `/order-confirmed`, `/admin`. URL-based Meta custom conversions depend on this (§8).

---

## 2. Information architecture

Public: `/` (home, all conversion sections) · `/checkout` · `/order-confirmed`. FAQ + Contact/Support render as homepage sections (no separate routes for MVP).
Admin (auth-gated): `/admin` (order list) · `/admin/orders/:id` (detail + controls).

---

## 3. Brand system (LOCKED — client assets, images 8 & 10)

### Colors
```
--lf-black:     #0D0D0D   /* page background */
--lf-charcoal:  #2A2A2A   /* cards, elevated surfaces, section bands */
--lf-gold:      #D4AF37   /* primary accent, CTAs, highlights, active */
--lf-brown:     #6B4E31   /* secondary / coffee accent — sparingly */
--lf-cream:     #F2E9DB   /* warm off-white accents & alt text */
--lf-white:     #FFFFFF   /* primary text */
```
Semantic (admin/status only): success `#3FB950`, warning `#D4AF37`, error `#F85149`.
CTA: gold fill + black text, gold glow on hover. Never low-contrast gold-on-gold.

### Typography (all Google Fonts — free)
- **League Gothic** → hero/display headlines (H1–H2)
- **Bebas Neue** → section kickers, labels, metric numbers, nav
- **Montserrat** (Regular/Medium) → body, UI, forms

Headlines UPPERCASE, condensed, high-contrast. Large type, premium spacing, generous negative space. Tabular figures for all metrics/prices.

### Logo & voice
Primary monogram: white **L** / gold **F** (image 8 = cleanest, use for nav + favicon). Full lockup for desktop nav. Client to supply vector. Essence (locked): *"We don't just make coffee. We fuel your discipline and power your transformation."* Handle: `@leanfitcoffee`.

---

## 4. Product source of truth — `src/content/product.ts`

### 4a. LOCKED facts (consistent across images 1–10)
```ts
export const PRODUCT = {
  name: "Lean & Fit Protein Coffee",
  variant: "Classic",
  sachetGrams: 25, sachetsPerBox: 10, boxGrams: 250,
  price: null,            // BLOCKING — client must supply base price (PHP)
  metrics: { protein: "15g", calories: "<100", sugar: "Low", transFat: "0g" },
  nutrition: {            // image 5 back panel
    servingSize: "1 Sachet (25g)", servingsPerBox: 10, calories: "90 kcal",
    totalFat: "2g", saturatedFat: "1g", transFat: "0g", cholesterol: "5mg",
    sodium: "60mg", totalCarb: "6g", dietaryFiber: "2g", totalSugars: "1g",
    addedSugars: "0g", protein: "15g", vitaminD: "0mcg", calcium: "80mg",
    iron: "0.5mg", potassium: "150mg",
  },
  badges: ["Low Sugar", "No Added Preservatives", "Gluten Free", "Keto Friendly"],
  prep: ["Tear 1 sachet", "Add 180ml hot water", "Stir", "Enjoy"],
  ingredients: [ /* SEE §4c — includes senna, confirm before launch */ ],
  claims: [ /* SEE §4c — client must approve final claim list */ ],
} as const;
```

### 4b. Tagline (client to lock ONE — defaults here)
```ts
export const TAGLINE = {
  primary:    "FUEL YOUR DAY. SHAPE YOUR BEST.",
  hero:       "COFFEE THAT WORKS AS HARD AS YOU DO.",
  supporting: "LOOK GOOD. FEEL STRONG.",
  hashtag:    "#LeanStrongConfident",
};
```

### 4c. CONFIRM BEFORE LAUNCH — not final
1. **Price** — absent from every asset. Checkout math is blocked on this.
2. **15g vs 20g** — image 11 is an older/dead design (20g, 24g serving, soya, different logo, `leanandfit.com`). Confirm dead; all live copy = 15g / whey / `@leanfitcoffee`.
3. **Senna** — image 5 lists "Laxative (Senna Leaf Extract)." Changes honest "daily/anytime" copy. Confirm in final formula.
4. **Ingredient list** — differs image 5 vs 10 vs 11. Get one approved list.
5. **Final claims** — keep in `PRODUCT.claims`; default to lifestyle framing where unconfirmed.

---

## 5. Homepage (section by section)

Mobile-first. Sticky mobile CTA bar (`LEAN & FIT · [ ORDER NOW ]`) after hero scrolls out. Desktop nav: lockup · Product · Why · Ingredients · FAQ · `[ ORDER NOW ]` (gold).

1. **Hero** — full-bleed black, product + athletic imagery. H1 = `TAGLINE.hero`. Sub: "High protein. Low sugar. Made for an active lifestyle." CTA above the fold.
2. **Product intro** — large shot + name + functional-coffee description + metric row (`15g · <100 · LOW · 25g`). CTA.
3. **Why Lean & Fit** — comparison: Traditional Coffee vs Lean & Fit. "ONE COFFEE. MORE PURPOSE." CTA.
4. **Benefits** — 4–5 icon benefits from `PRODUCT.claims`, gold line-icon style.
5. **Lifestyle** — cinematic. "TRAIN. WORK. MOVE. REPEAT." Morning / Pre-Workout / Midday / On the Go.
6. **Product details** — "WHAT'S INSIDE": ingredients, full nutrition table (`PRODUCT.nutrition`), serving, prep.
7. **Ingredients spotlight** — Whey, Inulin, L-Carnitine, Green Tea, Chia, Collagen + approved one-liners.
8. **Social proof** — reviews / UGC / creator content. Small if few; expand later. No fabricated counts.
9. **Purchase** — strongest block. Product, price, qty stepper, live subtotal, `[ ORDER NOW ]` → `/checkout`.
10. **FAQ** — accordion, Product / Ordering, from `content/faq.ts`.
11. **Final CTA** — large band. `TAGLINE.primary` + copy + `[ ORDER LEAN & FIT ]`.

Build: use the garden-skills web-design-engineer recipe; enforce §3 tokens.

---

## 6. Checkout (`/checkout`) — method-branched

Single page, stepped visually. Cart in Zustand until submit. Order summary always shows: product, qty, unit price, subtotal, delivery fee, total.

**Delivery details (required):** full name, mobile (PH format), email, address, barangay, city/municipality, province, postal code. **Optional:** delivery notes. Full client-side validation.

**Payment methods** render from `content/payment.ts` (config-driven, §6a). Checkout branches on the selected method's `provider` / `requiresProof`:

**Manual (GCash · Maya · Bank Transfer — `provider: manual`, `requiresProof: true`)**
- Show instructions + account details (+ QR for GCash/Maya).
- Require: proof upload (JPG/PNG/PDF ≤5MB → Supabase Storage `payment-proofs`), reference number, amount paid, payment date.
- On submit: create `order` (status `pending`) + `payment` (provider `manual`, status `pending_verification`) → notify admin → fire `Purchase` (§8) → `/order-confirmed`.

**COD (`provider: cod`, `requiresProof: false`)**
- No proof, no payment fields. Copy: "Pay in cash when your order arrives."
- On submit: create `order` (status `confirmed`) + `payment` (method `cod`, provider `cod`, status `pending`) → notify admin → fire `Purchase` → `/order-confirmed`.

### 6a. `src/content/payment.ts` (config-driven)
```ts
export const PAYMENT_METHODS = [
  { code:'gcash',         label:'GCash',            provider:'manual', requiresProof:true,
    instructions:'', account:{ name:'', number:'' }, qr:'/img/gcash-qr.png' },
  { code:'maya',          label:'Maya',             provider:'manual', requiresProof:true,
    instructions:'', account:{ name:'', number:'' }, qr:'/img/maya-qr.png' },
  { code:'bank_transfer', label:'Bank Transfer',    provider:'manual', requiresProof:true,
    instructions:'', account:{ bank:'', name:'', number:'' } },
  { code:'cod',           label:'Cash on Delivery', provider:'cod',    requiresProof:false,
    instructions:'Pay in cash when your order arrives.' },
  // future: { code:'paymongo', provider:'paymongo', ... } — DO NOT BUILD (§13)
] as const;
```
Adding a method must never require touching the order/checkout structure — that's the point of the config + provider abstraction.

---

## 7. Order confirmation (`/order-confirmed`)

"ORDER RECEIVED!" · `Thanks, {name}. We've received your order.` · `ORDER #LF-000123` · status chip (manual: `🟡 Payment Verification`; COD: `🟢 Order Confirmed`) · next-steps note · "confirmation sent to your email." Order number: `LF-` + zero-padded sequence.

---

## 8. Conversion instrumentation (Meta)

### Client-side Pixel events
| Stage | Event | Payload |
|---|---|---|
| Page load | `PageView` | auto |
| Product section in view | `ViewContent` | `content_ids:['lf-classic']`, `value`, `currency:'PHP'` |
| Reach `/checkout` | `InitiateCheckout` | `value:subtotal`, `currency:'PHP'`, `num_items` |
| Select payment method | `AddPaymentInfo` | `value`, `currency:'PHP'` |
| Order submitted (manual or COD) | `Purchase` | `value:total`, `currency:'PHP'`, `content_ids`, `num_items`, **`eventID:orderId`** |

Always pass `eventID = orderId` so a future server-side CAPI Purchase dedupes.

**Purchase timing (decision):** fire `Purchase` **on order submission** client-side for MVP — at low volume the pixel needs events to exit learning (~50 conv/week per ad set). Consequence: Ads Manager revenue includes unpaid/rejected/uncollected orders — treat as directional, reconcile true revenue in the backend.

### Custom conversions (Meta Events Manager)
- **LF – Reached Checkout** → URL contains `/checkout` (or `InitiateCheckout`)
- **LF – Order Submitted** → URL contains `/order-confirmed` (or `Purchase`)

### CAPI (phase 2 — architecture makes this nearly free)
Because payment is its own record, a Supabase Edge Function fires a **server-side `Purchase` when `payment.status → paid`** (verified GCash/Maya/Bank, collected COD, or future gateway) — clean revenue signal, deduped by `eventID`, **zero checkout changes**. Scaffold the stub now; wire later.
**COD caveat:** the client-side COD `Purchase` fires at confirm, but some COD orders are never collected — COD-heavy campaigns will read rosier than reality until you optimize on the CAPI `paid` signal.

Env: `VITE_META_PIXEL_ID`, server-only `META_CAPI_TOKEN`.

---

## 9. Admin dashboard (`/admin`)

Supabase Auth gated (single admin, MVP). Order list columns: Order · Customer · Amount · Method · Payment Status · Order Status · Date. **Flag COD rows visibly** (return-to-sender risk). Row → detail.

**Unified payment panel — identical regardless of provider** (per client spec 6.7):
```
Order #LF-00124 · Maria Santos · Total ₱1,500
Method: GCash    Provider: Manual    Payment: Pending Verification
Proof: [ View Image ]   (manual only; hidden for COD)
```
Detail also shows customer info, product + qty, delivery, payment reference/amount/date, order + payment status history.

**Actions:**
- Manual: **Approve Payment** (`payment → paid`, auto-advance `order → confirmed`, email) · **Reject Payment** (`payment → rejected`, order stays `pending`, correction email).
- COD: **Mark Paid** on delivery (`payment → paid`).
- Fulfillment: advance **Packing → Shipped** (capture courier + tracking) **→ Completed**.
- Exceptions: **Refund** (`payment → refunded`, done externally) · **Cancel** (`order → cancelled`). Both manual admin paths.

Every transition writes history + triggers the matching email (§10).

---

## 10. Status model + emails

**Two independent axes** (do not merge — this is the core of the Phase 2 architecture):

| order_status (fulfillment) | payment_status |
|---|---|
| `pending` · `confirmed` · `packing` · `shipped` · `completed` · `cancelled` | `pending` · `pending_verification` · `paid` · `failed` · `rejected` · `refunded` · `cancelled` |

Flow map:
- **Manual:** submit → order `pending` / payment `pending_verification` → admin approve → payment `paid` → order `confirmed` → packing → shipped → completed. Reject → payment `rejected`, order stays `pending`, customer corrects, re-verify.
- **COD:** submit → order `confirmed` / payment `pending` → packing → shipped → completed; admin marks payment `paid` on collection.
- **Future PayMongo:** order created + payment created → gateway → payment `paid` → order `confirmed` → … (same fulfillment tail).

Rule: when `payment.status → paid` and `order.status = pending`, auto-advance `order → confirmed` + email.

### Customer emails (Resend, subjects)
- Order submitted (manual) — `Lean & Fit Order Received — #LF-000123`
- Order confirmed (COD) — `Your Lean & Fit COD Order Is Confirmed`
- Payment approved — `Your Lean & Fit Payment Has Been Verified`
- Payment rejected — `Action Required — Lean & Fit Payment Verification`
- Packing — `Your Lean & Fit Order Is Being Packed`
- Shipped — `Your Lean & Fit Order Has Shipped` (courier + tracking)

Business inbox: new-order notification on submit (summary + proof link for manual). Templates dark/gold, logo header, stored in `content/emails.ts`.

---

## 11. Supabase schema

```sql
-- Fulfillment lifecycle (independent of payment)
create type order_status as enum
  ('pending','confirmed','packing','shipped','completed','cancelled');

-- Payment lifecycle (independent of order)
create type payment_status as enum
  ('pending','pending_verification','paid','failed','rejected','refunded','cancelled');

create type payment_method   as enum ('gcash','maya','bank_transfer','cod'); -- +paymongo future
create type payment_provider as enum ('manual','cod');                       -- +paymongo future

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,               -- LF-000123
  -- customer
  customer_name text not null, email text not null, mobile text not null,
  address text not null, barangay text not null, city text not null,
  province text not null, postal_code text not null, delivery_notes text,
  -- order lines
  product text not null default 'Lean & Fit Protein Coffee - Classic',
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null, subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0, total numeric(10,2) not null,
  -- fulfillment
  status order_status not null default 'pending',
  courier text, tracking_number text,
  -- attribution hook (stubbed, nullable — reseller/affiliate-ready, zero cost now)
  ref_code text,
  reseller_id uuid,                            -- FK to resellers(id) in future; null now
  -- meta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Payment is its own record. Order is NOT the payment. One order → one payment (MVP).
create table payments (
  id uuid primary key default gen_random_uuid(),
  payment_no text unique not null,             -- PAY-000124
  order_id uuid not null references orders(id) on delete cascade,
  method   payment_method   not null,
  provider payment_provider not null default 'manual',
  status   payment_status   not null default 'pending',
  amount   numeric(10,2) not null,
  currency text not null default 'PHP',
  -- manual fields (nullable — unused for COD/gateway)
  reference text,                              -- customer ref (manual) / provider txn (future)
  proof_path text,                             -- storage key, manual only
  payment_date date,
  -- audit
  submitted_at timestamptz default now(),
  verified_at  timestamptz,
  verified_by  uuid,                           -- admin user
  -- gateway-ready (nullable now — DO NOT populate in Phase 2)
  provider_txn_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null, note text,
  created_at timestamptz not null default now()
);

create table payment_status_history (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  status payment_status not null, note text, changed_by uuid,
  created_at timestamptz not null default now()
);
```

**Storage:** private bucket `payment-proofs`; admin reads via signed URLs only.

**RLS:**
- `orders`, `payments`: anon `INSERT` (checkout) only; no anon `SELECT`/`UPDATE`; authenticated admin full access.
- history tables: admin read/write only.
- `payment-proofs`: no public read; constrained anon `INSERT`; admin signed-URL read.

`updated_at` triggers on `orders` + `payments`. Order/payment numbers via sequence or `LF-`/`PAY-` + padded serial.

---

## 12. Product imagery — gpt-image-2

Supplied "photos" are AI marketing renders (note text artifacts, image 11), not physical-product photography. **Prefer edit mode** — feed the cleanest existing render (image 5/9 box, image 8 logo) as source so packaging stays consistent, rather than text-to-image inventing a new sachet.

Hero/product-card (text-to-image, brand-locked; keep text OUT, overlay headline/metrics in CSS):
```
Premium fitness product card, hero composition. A single upright protein-coffee sachet,
front and center, sharply lit on a deep charcoal-to-black (#0D0D0D) studio background with
a subtle radial gradient and soft reflection beneath. High-contrast rim lighting with warm
metallic-gold (#D4AF37) edge highlights. A thin gold accent line frames the composition like
a premium card border. Faint coffee beans and subtle steam in the shadowed background.
Cinematic, disciplined, aspirational — dark-gym gold-and-black energy, without copying any
real brand. Photorealistic commercial product photography, shallow depth of field, crisp
product focus, generous negative space in the upper third for a headline. Palette strictly
charcoal/black, metallic gold, clean white. No text baked in. Aspect ratio 1:1.
```
Run `1024x1024` (feed) + `1024x1536` (Stories/hero). Edit-mode once a cutout exists:
```
edit.js --image sachet-cutout.png --prompt "Place this product on a deep charcoal studio
background with warm gold rim lighting and a thin gold accent border, premium fitness
commercial photography, high contrast, negative space top third for headline, no added text, 1:1"
```
Mode A needs `ENABLE_GARDEN_IMAGEGEN` + `OPENAI_API_KEY`; else the skill returns the rendered prompt.

---

## 13. Out of scope + PayMongo guardrail

**Not in this launch:** live PayMongo integration · PayMongo API implementation · automated gateway processing · automated payment reconciliation · automated refunds/payouts · customer accounts · subscriptions · loyalty · inventory · courier API · Shopee/Lazada/TikTok Shop · advanced CRM/analytics · coupon/promo engine.

**Included:** manual GCash/Maya/Bank Transfer · COD · proof upload · admin verification · payment status management · payment records · **payment-provider-ready architecture + data structures for future PayMongo**.

**HARD BUILD RULE (client spec 6.6):** implement the tables, `provider` field, and status abstraction — then **stop**. Do **not** write PayMongo service classes, webhook handlers, redirect flows, or API scaffolding. The `provider:'paymongo'` path is a future config entry, nothing more. Over-building here is the exact bloat this architecture exists to avoid.

---

## 14. Build sequence

- **M0 — Foundation:** scaffold, brand tokens, fonts, routing, `content/*` (locked data + placeholders), Supabase project + full schema (§11) + RLS + storage. *(No blocked inputs needed — start here.)*
- **M1 — Landing page:** all §5 sections, sticky mobile CTA, responsive, `PageView`/`ViewContent`.
- **M2 — Checkout:** Zustand cart, delivery form + validation, config-driven methods, **manual vs COD branch**, proof upload, order + payment creation, `InitiateCheckout`/`AddPaymentInfo`/`Purchase`, `/order-confirmed`.
- **M3 — Emails:** Resend, all customer templates (incl. COD-confirmed) + business notification.
- **M4 — Admin:** auth, order list (COD flagged), unified payment panel, approve/reject/mark-paid/refund/cancel, fulfillment advance, history, signed-URL proof.
- **M5 — Instrumentation:** verify custom conversions; CAPI Edge Function stub firing on `payment.status → paid`.
- **M6 — Launch prep:** resolve §4c, price live, final imagery, mobile QA.

---

## 15. Open inputs (client) — launch blocked until these land

1. **Base price (PHP)** ✅ locked at ₱250 + delivery fee(s)/coverage — still open.
2. Confirm image 11 (20g) dead → all copy 15g — still open (site treats 15g/whey as canonical in the meantime).
3. Final ingredient list + senna yes/no — still open.
4. Approved claim list — still open.
5. Locked tagline — still open (default in place).
6. Payment account details + **GCash & Maya QR** + bank details — still open.
7. Business notification email + who verifies payments — still open.
8. Vector logo ✅ received and wired in. Final product/hero/lifestyle photos ✅ received and wired in. Testimonials — still placeholder. FAQ answers — still placeholder.

---

## 16. Migration note (only if v1 was already coded)

If Phase 1 shipped against the v1 schema (payment fields on `orders`, single blended enum), this is a contained migration — do it **before real order data exists**:
1. Create `payment_status`, `payment_method`, `payment_provider` enums + `payments` + `payment_status_history` tables.
2. Backfill: one `payments` row per existing order from the old payment columns; map old blended statuses onto the two new axes.
3. Drop payment columns from `orders`; migrate `order_status` to the fulfillment-only enum.
4. Add `ref_code` + `reseller_id` to `orders`.
5. Point admin + checkout at the new tables.
If greenfield, ignore this section — §11 is already canonical.

**Status: greenfield rebuild applied.** No Supabase project had been provisioned with real order data at the time v2 landed (confirmed — `.env`/live backend never existed for this repo), so `supabase/schema.sql` was rewritten directly to the v2 canonical schema rather than authoring a formal migration script. See `supabase/README.md` for the up-to-date setup path.
