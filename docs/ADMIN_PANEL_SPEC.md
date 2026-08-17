# Lean & Fit Phase 2 — Admin Panel Skill

> Uploaded 2026-08-17. Client spec for a full commerce CMS layer (products,
> centralized pricing, promotions, partner pricing, media management, audit
> log) on top of the existing order/payment admin (`CLAUDE.md`). Being
> built in the priority order §25 specifies; see the repo's task list for
> current phase status. §25 phases 1-3 (product data model, pricing engine,
> promotion engine) are done - see `supabase/migrations/0002_admin_panel_products_pricing.sql`
> and `src/lib/pricing.ts`. Preserved verbatim below as the source of truth
> for the remaining phases.

## Purpose

Build and maintain the Lean & Fit Phase 2 Admin Panel as the centralized control system for:

- Products
- Product pricing
- Website product content
- Website imagery
- Promotions and discount codes
- Partner pricing
- Orders
- Resellers, distributors, and franchise partners
- Audit history

The Admin Panel must function as the **single source of truth** for all managed product, pricing, promotional, and content information.

Changes made by authorized administrators must propagate consistently across all relevant customer-facing and internal systems.

---

# 1. Core Architecture Principle

## Single Source of Truth

Do not hard-code product information, pricing, partner pricing, promotional pricing, or website-managed imagery into individual frontend components.

The system must use centralized data.

The intended architecture is:

```text
ADMIN PANEL
    │
    ├── Products
    ├── SRP / Pricing
    ├── Partner Pricing
    ├── Promotions
    ├── Website Content
    └── Media Assets
          │
          ↓
     CENTRAL DATA
          │
     ┌────┼───────────────┐
     ↓    ↓               ↓
 WEBSITE CHECKOUT   ADMIN   RESELLER
```

Any frontend or internal system displaying product information must retrieve the current data from the centralized source.

---

# 2. Product Management

## 2.1 Product Creation

Authorized administrators must be able to create new products.

Required fields:

- Product name
- Product description
- SRP
- Product images
- Product status
- Promo eligibility

Optional product fields may be added where required by the existing product model.

### Product status

Supported states:

- Draft
- Active
- Inactive

An inactive product must not be available for new customer orders.

Historical orders containing an inactive product must retain the original product information and pricing applicable to that order.

---

# 3. Product Editing

Administrators must be able to edit:

- Product name
- Description
- SRP
- Product images
- Availability/status
- Promo eligibility

Changes must be reflected throughout the platform wherever the current product information is intended to be displayed.

Do not duplicate product data into independent frontend configurations.

---

# 4. Retail Price Management

The administrator must be able to set the **SRP / retail price** of every product.

Example:

```text
Product:
Lean & Fit Protein Coffee

SRP:
₱380
```

The SRP must be the authoritative retail price used by the system.

The current SRP must synchronize across:

- Public website
- Product pages
- Product cards
- Checkout
- Order calculations
- Admin Panel
- Promotions
- Partner pricing
- Reseller Portal
- Distributor pricing
- Franchise pricing

---

# 5. Price Changes

When an administrator changes an SRP:

```text
Previous SRP: ₱380
New SRP: ₱400
```

all current calculations that depend on SRP must use the new price.

Partner pricing must automatically recalculate from the new SRP.

Example:

```text
SRP = ₱400

Reseller = 20% below SRP = ₱320
Distributor = 30% below SRP = ₱280
Franchise = 40% below SRP = ₱240
```

Do not store independently editable partner prices unless the business rules explicitly require this later.

---

# 6. Website Image Management

Administrators must be able to replace images used by the website without developer intervention.

Managed image types may include:

- Hero images
- Product section backgrounds
- Benefits section backgrounds
- Ingredients section backgrounds
- Product images
- Product detail images
- Testimonial/review images
- Promotional imagery
- Other designated website media

---

# 7. Image Upload Guidance

The Admin Panel must clearly communicate the required image specifications for each image slot.

The upload interface should display:

- Recommended canvas size
- Aspect ratio
- Accepted format
- Maximum file size where applicable
- Optional crop/safe-area guidance

Example:

```text
Product Section Background

Recommended:
1920 × 1080 px

Aspect Ratio:
16:9

Format:
WebP / JPG

Important:
Keep important subjects within the safe area.
```

Do not use one universal image specification for every asset.

Each website image slot should define its own recommended specifications based on how the asset is rendered.

---

# 8. Image Preview

Before saving a replacement image, the administrator should be able to preview the asset within the intended component or aspect ratio where practical.

The system should help prevent:

- Incorrect cropping
- Excessive image stretching
- Important subjects being cut off
- Poor-quality images
- Incorrect aspect ratios

---

# 9. Promotional Pricing

Administrators must be able to create and manage promotions and discount codes.

A promotion may contain:

- Promo name
- Discount code
- Discount type
- Discount amount/value
- Start date
- End date
- Usage limit
- Applicable products
- Active/inactive status

Supported discount types:

- Percentage discount
- Fixed amount discount

---

# 10. Promo Eligibility

Each product must have a configurable:

**Exempt from Promo**

setting.

Example:

```text
☐ Exempt from Promo
```

### Default

If the product is **not exempt**, an applicable active promotion may supersede its standard retail pricing.

### Exempt

If:

```text
Exempt from Promo = TRUE
```

the active retail promotion must not alter that product's price.

---

# 11. Promotional Pricing Priority

The pricing engine must evaluate promotional eligibility centrally.

Conceptually:

```text
GET PRODUCT
     ↓
GET CURRENT SRP
     ↓
IS PRODUCT EXEMPT FROM PROMO?
     │
     ├── YES → USE SRP
     │
     └── NO
           ↓
     IS ACTIVE PROMO APPLICABLE?
           │
           ├── YES → APPLY PROMO
           │
           └── NO → USE SRP
```

The promotional calculation must not be separately implemented across different pages.

Checkout must use the same pricing calculation as the product page.

---

# 12. Pricing Synchronization

All pricing calculations must originate from centralized pricing logic.

Never independently calculate pricing in:

- Product cards
- Product detail pages
- Checkout
- Admin
- Reseller Portal
- Promotional components

The system must avoid situations where:

```text
Website says ₱380
Checkout says ₱400
Admin says ₱380
```

The displayed and calculated price must be consistent.

---

# 13. Partner Pricing

Lean & Fit has three partner/client types:

| Partner Type | Discount From SRP |
|---|---:|
| Reseller | 20% |
| Distributor | 30% |
| Franchise | 40% |

These are **partner pricing discounts**, not commissions.

Do not label these as commission rates.

---

# 14. Partner Price Calculation

Partner price is calculated from the current SRP.

Formula:

```text
Partner Price = SRP × (1 - Partner Discount)
```

Example:

```text
SRP = ₱380

Reseller:
₱380 × 80% = ₱304

Distributor:
₱380 × 70% = ₱266

Franchise:
₱380 × 60% = ₱228
```

Partner gross margin when selling at SRP:

```text
Reseller:
₱380 - ₱304 = ₱76

Distributor:
₱380 - ₱266 = ₱114

Franchise:
₱380 - ₱228 = ₱152
```

---

# 15. Partner Pricing Configuration

Partner discount percentages should be configurable from the Admin Panel.

Initial configuration:

```text
Reseller: 20%
Distributor: 30%
Franchise: 40%
```

Do not hard-code these values into frontend components.

If the administrator changes a partner discount:

```text
Reseller: 20% → 25%
```

the system should automatically recalculate the applicable partner pricing from the current SRP.

---

# 16. Partner Pricing and Retail Promotions

Partner pricing and retail promotional pricing are separate pricing contexts.

Do not automatically stack retail promotions onto partner pricing unless an explicit business rule is introduced.

Default model:

### Retail customer

```text
SRP
↓
Applicable retail promotion
↓
Customer price
```

### Partner

```text
SRP
↓
Partner pricing tier
↓
Partner price
```

The system must not assume that a retail promo should further discount a reseller, distributor, or franchise purchase.

---

# 17. Audit Trail

The Admin Panel must maintain an audit trail of important administrative changes.

Every significant change should record:

- Action
- Entity affected
- Previous value
- New value
- User/admin responsible
- Timestamp
- Relevant record ID

---

# 18. Auditable Actions

At minimum, record:

## Products

- Product created
- Product edited
- Product activated
- Product deactivated
- Product archived

## Pricing

- SRP changed
- Partner pricing changed

## Promotions

- Promotion created
- Promotion edited
- Promotion activated
- Promotion deactivated
- Discount code changed

## Content

- Product description changed
- Product image changed
- Website image replaced

## Orders

- Order status changed
- Payment status changed
- Order information modified

## Partners

- Partner created
- Partner status changed
- Partner type changed
- Partner pricing tier changed

---

# 19. Audit Log Example

Example record:

```text
PRODUCT PRICE UPDATED

Product:
Lean & Fit Protein Coffee

Previous:
₱380

New:
₱400

Changed By:
Admin User

Date:
August 17, 2026
10:32 AM
```

Another example:

```text
PARTNER PRICING UPDATED

Partner Type:
Reseller

Previous:
20%

New:
25%

Changed By:
Admin User

Date:
August 17, 2026
10:41 AM
```

---

# 20. Historical Order Integrity

Price changes must not rewrite historical transactions.

If an order was placed at:

```text
₱380
```

and the administrator later changes the SRP to:

```text
₱400
```

the historical order must remain:

```text
Original Order Price:
₱380
```

The system must preserve the actual price used at the time of the transaction.

The same principle applies to:

- Product price
- Promotional discount
- Partner discount
- Partner price
- Order total

---

# 21. Centralized Media Management

Website media should be referenced through managed media records rather than hard-coded file paths wherever practical.

A media record should be capable of storing:

- Asset name
- Asset type/slot
- File location
- Format
- Dimensions
- Upload date
- Uploaded by
- Active version
- Previous versions where applicable

When an administrator replaces an image, the website should use the new active asset.

---

# 22. Admin Navigation

Recommended Admin Panel navigation:

```text
DASHBOARD

ORDERS

PRODUCTS
  ├── Products
  ├── Pricing
  └── Media

PROMOTIONS

PARTNERS
  ├── Resellers
  ├── Distributors
  ├── Franchise
  └── Partner Pricing

MARKETING
  └── Website Media

AUDIT LOG

SETTINGS
```

---

# 23. Admin Permissions

Only authorized administrators should be able to modify:

- Product information
- Product prices
- Promotions
- Partner pricing
- Website media
- Partner records
- Order information

All privileged actions must be authenticated.

Audit records must identify which administrator performed the action.

---

# 24. Data Integrity Requirements

The system must prevent:

### Price inconsistency

Different parts of the platform displaying different current prices.

### Stale partner pricing

Partner pricing remaining based on an old SRP.

### Promo bypass

A product marked as promo-eligible failing to receive an applicable valid promotion.

### Promo override

A product marked **Exempt from Promo** receiving a retail promotion.

### Historical price mutation

Existing orders changing when current product pricing changes.

### Unauthorized changes

Non-admin users modifying centralized pricing or content.

---

# 25. Implementation Priority

Build in this order:

### 1. Product data model

Create the centralized product structure.

### 2. Pricing engine

Implement:

- SRP
- Partner pricing
- Price calculation

### 3. Promotion engine

Implement:

- Promo codes
- Discount rules
- Promo eligibility
- Exempt from Promo

### 4. Admin Product Management

Implement:

- Product creation
- Editing
- Status
- Pricing

### 5. Media Management

Implement:

- Website image management
- Image requirements
- Preview
- Replacement

### 6. Audit System

Implement audit logging for all critical administrative actions.

### 7. Website Integration

Connect the public website to the centralized product/pricing/content system.

### 8. Reseller/Partner Integration

Connect partner accounts and partner pricing to the same pricing engine.

---

# 26. Non-Negotiable Development Rules

1. **Do not hard-code product prices.**
2. **Do not hard-code partner discounts in frontend components.**
3. **Do not create separate pricing logic for checkout and product pages.**
4. **Do not allow historical orders to change when current prices change.**
5. **Do not treat partner discounts as commissions.**
6. **Do not stack retail promotions onto partner pricing unless explicitly configured.**
7. **Do not allow promo-eligible products to bypass valid promotions.**
8. **Do not apply promotions to products marked Exempt from Promo.**
9. **Do not allow unauthorized users to modify pricing or managed content.**
10. **Every critical administrative change must be auditable.**
11. **All website-managed product/content information must come from centralized data.**
12. **Image upload interfaces must provide the correct requirements for each image slot.**

---

# 27. Acceptance Criteria

The Admin Panel implementation is considered complete when an administrator can:

- Create a new product.
- Set its SRP.
- Edit its description.
- Upload its images.
- See image requirements before uploading.
- Change the SRP.
- See the new SRP reflected across the platform.
- Create a promo code.
- Apply a promotion to eligible products.
- Mark a product as Exempt from Promo.
- Confirm that an exempt product ignores the promotion.
- Configure Reseller, Distributor, and Franchise discounts.
- See partner pricing automatically calculated from SRP.
- Change SRP and see partner prices recalculate.
- Replace a website image without developer intervention.
- View the history of important changes.
- Identify who made each change.
- Confirm historical orders retain their original pricing.

# Final Principle

The Lean & Fit Admin Panel is not simply an administrative dashboard.

It is the **central control layer for the entire Lean & Fit commerce ecosystem**.

The fundamental relationship is:

```text
PRODUCT
   ↓
SRP
   ↓
┌───────────────┬──────────────────┐
│               │                  │
RETAIL        PROMOTION       PARTNER PRICING
│               │                  │
Customer      Customer          Reseller
Price         Promo Price       Distributor
                                  Franchise
   │               │                  │
   └───────────────┴──────────────────┘
                   ↓
              CHECKOUT / ORDER
                   ↓
              ADMIN / RESELLER
```

Any future feature that deals with product price, promotion, or partner pricing must use this centralized pricing architecture rather than introducing a separate calculation.