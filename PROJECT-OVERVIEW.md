# Lean & Fit Protein Coffee — Project Overview

*A plain-language summary of what's been built, prepared for the client.*
*For the full technical build spec, see [`CLAUDE.md`](./CLAUDE.md).*

---

## 1. What This Is

A complete online sales system for Lean & Fit Protein Coffee, built around one
goal: turn people who see the product on Facebook/Instagram/TikTok into
completed, paid orders — with as little friction as possible.

It's made of three connected pieces:

1. **The public website** — the page customers land on from ads, where they
   learn about the product and place an order.
2. **The Admin Portal** — where you and your staff manage orders, payments,
   products, promotions, and the reseller network.
3. **The Partner Portal** — a self-serve dashboard for resellers/distributors/
   franchise partners to get their referral link, see their sales, and track
   their earnings.

All three run from one codebase, each on its own web address, so nothing has
to be built or paid for twice.

---

## 2. The Public Website

**What a customer sees, in order:**

- A bold, mobile-first landing page (dark/gold "discipline and
  transformation" look, per the brand system) built to work as the landing
  spot for paid social ads.
- Product introduction, a "Traditional Coffee vs. Lean & Fit" comparison,
  benefit highlights, a lifestyle section, full nutrition/ingredient panel,
  and a social proof section.
- A checkout page where the customer chooses a payment method — **GCash,
  Maya, Bank Transfer** (all manual: customer uploads proof of payment) or
  **Cash on Delivery** — fills in delivery details, and submits the order.
- An order confirmation page showing their order number and status.
- A sticky "Order Now" button that follows the customer as they scroll, and
  Facebook Pixel tracking wired in at every key step (page view, product
  view, checkout started, payment method chosen, order placed) so ad
  performance can be measured and optimized.

**How a referral link works:** if a customer arrives through a partner's
personal link (e.g. `leanandfit.ph/juandelacruz`), that's remembered through
their whole visit, and if they check out, the sale is automatically recorded
under that partner along with the commission owed to them — no manual
matching required.

---

## 3. Order & Payment Handling

Every order goes through two independent tracks that are managed separately,
on purpose:

- **Fulfillment status** — Pending → Confirmed → Packing → Shipped →
  Completed (or Cancelled/Returned).
- **Payment status** — Pending → Verified/Paid (or Rejected/Refunded).

This split means, for example, a GCash payment can be verified as legitimate
independently of whether the box has shipped yet — and a Cash-on-Delivery
order can be marked "confirmed" immediately (nothing to verify upfront) while
its payment stays "pending" until the courier actually collects payment.

Every status change automatically emails the customer (order received,
payment verified, packed, shipped, etc.) and notifies your team of new
orders.

The system is also built so that adding a real payment gateway (PayMongo,
for card/e-wallet auto-processing) later is a small addition, not a rebuild
— that groundwork is in place but the gateway itself hasn't been built, since
manual payment verification is what's needed for launch.

---

## 4. The Admin Portal (`admin.leanandfit.ph`)

Everything your team needs to run the business day to day:

- **Orders** — full order list with filters, a detail view per order, and
  one-click actions: approve/reject a manual payment, mark a COD order paid,
  advance an order through packing → shipped → completed, or flag a return.
- **Products** — edit product details, pricing, and images without needing a
  developer.
- **Promotions** — two separate tools: **Product Promotions** (e.g. bundle
  deals) and **Discount Codes** (coupon codes customers enter at checkout).
- **Partners** — see every reseller/distributor/franchise applicant, approve
  or reject them, manage their tier pricing, and reassign them in the
  network.
- **Top Sellers** — a live leaderboard of the top 20 partners by sales,
  filterable by month, so you can see who's driving results.
- **Audit Log** — a record of who changed what and when, for accountability.
- **User Management** — add staff accounts for your team, and control
  exactly what each one can access (see below).

### Staff accounts with real permission control

Rather than every staff member having full access (or none), an Admin can
now:

- Create a staff login (email + password) for a team member.
- Grant them access to specific areas individually — **Products**,
  **Promotions**, and **Partner Pricing** — while Orders, Partners, Top
  Sellers, and the Audit Log stay available to every staff account by
  default.
- Edit any existing staff account later — change their name, email, reset
  their password, adjust what they can access, promote them to full Admin,
  or remove their access entirely.
- The system always protects against accidentally locking everyone out —
  it won't let the last remaining full Admin account be demoted or removed.

---

## 5. The Partner Portal (`partner.leanandfit.ph`)

A self-serve dashboard for anyone in the reseller/distributor/franchise
program:

- **Their personal referral link** — a clean, shareable URL in the format
  `leanandfit.ph/theirname`, plus a scannable QR code. Any sale made through
  that link is automatically attributed to them.
- **Overview** — dashboard cards for **Total Online Sales** and **Total
  Earnings**, filterable by month, so a partner can see exactly what they've
  sold and what they're owed at a glance.
- **Top Sellers** — the same leaderboard shown in the Admin Portal, so
  partners can see how they rank against the rest of the network.
- **Client Orders / My Orders** — orders they've referred, separated from
  purchases they've made themselves.
- **Customers** — a summary of the people they've referred.
- **Commission** — a running total of what they've earned, broken out by
  what's payable, pending, or void (e.g. a cancelled order).
- **Marketing Materials** — shared assets partners can use to promote.

Partners log in with an email/password an Admin sets for them (no
complicated invite-link flow), and everything above updates automatically as
orders come in — no manual bookkeeping.

---

## 6. What Still Needs Your Input Before Full Launch

A handful of business decisions are still open — the site works end-to-end
today with reasonable defaults/placeholders, but these should be locked
before running real ad spend:

| # | What's needed | Status |
|---|---|---|
| 1 | Delivery fee amount(s) and coverage area | Base price (₱250) is locked; delivery fee is still open |
| 2 | Confirm the 15g/whey formula is final (vs. an older 20g/soya version that appears in one supplied asset) | Site currently treats 15g/whey as the correct, current version |
| 3 | Final ingredient list, and whether Senna Leaf Extract (a laxative) is in the formula | Affects whether we can honestly market it as an "anytime" coffee |
| 4 | Final list of approved marketing claims | Site defaults to lifestyle-focused claims where unconfirmed |
| 5 | Final tagline | A default tagline is in place |
| 6 | GCash/Maya QR codes and bank account details for manual payment | Checkout can't display real payment instructions without these |
| 7 | Which email address should receive new-order notifications, and who on your team verifies payments | |
| 8 | Real customer testimonials and FAQ answers | Currently placeholder content |

Logo, product photography, and hero imagery have already been supplied and
are live on the site.

---

## 7. What's Intentionally *Not* Included (For Now)

To keep the initial launch focused, the following were deliberately left out
— the system is built so they can be added later without reworking what
already exists:

- Automated payment gateway processing (PayMongo) — manual GCash/Maya/Bank
  verification + COD covers launch; the data structure is ready for this to
  slot in later.
- Automated refunds/payouts, customer accounts, subscriptions, loyalty
  points, inventory tracking, courier API integration, and marketplace
  integrations (Shopee/Lazada/TikTok Shop).
- A promo/coupon *engine* beyond the discount codes already built.

---

## 8. Where Things Stand Technically

- The website, checkout, admin portal, and partner portal are all built and
  functioning.
- A small number of recent backend updates (database changes) still need to
  be applied to the live production database before every newest feature
  (staff permissions, the newest referral link format, the Top Sellers
  leaderboard) is fully active there — this is a short, one-time technical
  step on our end, not something that needs your input.
- Everything is under active development on a single, continuously updated
  codebase, so new features and fixes ship incrementally.

---

## 9. Access

| Portal | Address | Who uses it |
|---|---|---|
| Public website | `leanandfit.ph` | Customers |
| Admin Portal | `admin.leanandfit.ph` | You / your staff |
| Partner Portal | `partner.leanandfit.ph` | Resellers / distributors / franchises |

Admin and staff logins are set directly by a full Admin from within the
Admin Portal — no email invite link required.

---

*Questions about anything above, or want to prioritize what gets tackled
next, just ask.*
