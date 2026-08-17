> Uploaded 2026-08-17, alongside a Part 2 addendum
> (`RESELLER_PORTAL_SPEC_PART2_ADDENDUM.md`) that modifies/extends this
> document (partner onboarding permissions hierarchy, dropship vs
> partner-fulfilled order visibility, staff admin roles). Building starts
> with Part 1 only, per explicit instruction; Part 2 is deliberately not
> yet implemented. See the repo's task list ("Reseller P1-*") for phase
> status. Phase A (territories + partners data model,
> `supabase/migrations/0004_reseller_territories_partners.sql`,
> `src/types/territory.ts`, `src/types/partner.ts`) is done.

# Lean & Fit Phase 2
## Partner Distribution, Reseller Portal & Territorial Sales System

## 1. Purpose

Phase 2 expands Lean & Fit from a customer-facing e-commerce website into a **multi-level partner distribution and sales ecosystem**.

The system must support:

- Retail customers
- Resellers
- Distributors
- Franchise partners
- Geographic/territorial assignments
- Partner-specific pricing
- Partner referral links
- Partner referral codes
- Partner QR codes
- Hierarchical order routing
- Manual fulfillment
- Lean & Fit dropshipping
- Partner earnings
- Partner dashboards
- Partner customers
- Partner order management
- Territorial planning
- Philippines territory visualization
- Partner onboarding and package purchases
- Auditability

The system must reflect the actual Lean & Fit distribution structure rather than treating every partner as an independent affiliate.

---

# 2. Lean & Fit Distribution Hierarchy

The fundamental commercial hierarchy is:

```text
RETAIL CUSTOMER
      ↓
RESELLER
      ↓
DISTRIBUTOR
      ↓
FRANCHISE
      ↓
LEAN & FIT MANAGEMENT
```

Each level may fulfill orders directly or request fulfillment/dropshipping from the next level above them.

---

# 3. Partner Types

Lean & Fit has three partner levels.

| Partner Type | Partner Discount From SRP | Geographic Level |
|---|---:|---|
| Reseller | 20% | Barangay |
| Distributor | 30% | City |
| Franchise | 40% | Region |

The partner discount is the **partner's acquisition price / pricing tier**.

It is not automatically a commission.

---

# 4. Example Pricing

If the product SRP is:

**₱380**

Then:

| Partner | Discount | Acquisition Price |
|---|---:|---:|
| Retail Customer | 0% | ₱380 |
| Reseller | 20% | ₱304 |
| Distributor | 30% | ₱266 |
| Franchise | 40% | ₱228 |

The pricing engine must calculate these prices from the current SRP.

---

# 5. Distribution Economics

The partner hierarchy creates a margin structure between levels.

## Retail Customer → Reseller

Retail customer pays:

**₱380**

Reseller acquisition price:

**₱304**

Reseller's margin:

**₱76 / 20%**

---

## Reseller → Distributor

The reseller receives their 20% partner pricing.

Distributor's acquisition price:

**₱266**

Reseller's price:

**₱304**

Distributor's margin:

**₱38 / 10%**

The distributor effectively supplies the reseller at the reseller's 20%-off price while acquiring the product at their own 30%-off price.

---

## Distributor → Franchise

Distributor acquisition price:

**₱266**

Franchise acquisition price:

**₱228**

Franchise margin:

**₱38 / 10%**

---

## Franchise → Lean & Fit

Franchise acquisition price:

**₱228**

Lean & Fit SRP:

**₱380**

The franchise acquires inventory at the 40%-off tier.

---

# 6. Important Terminology

The system should distinguish between:

### Partner Pricing

The price a partner pays based on their tier.

Example:

> Reseller Price = 20% below SRP

### Partner Margin

The difference between the partner's acquisition price and the price at which they sell.

### Partner Earnings / Commission

An amount payable to a partner when Lean & Fit or another upstream partner fulfills a transaction on the partner's behalf.

The system should not incorrectly label all 20%, 30%, and 40% partner discounts as commissions.

---

# 7. Geographic / Territorial Assignment

Lean & Fit uses geographic territory allocation.

The system must support:

### Franchise

Regional territory.

Example:

**NCR**

### Distributor

City-level territory.

Example:

**Marikina City**

### Reseller

Barangay-level territory.

Example:

**Barangay Concepcion Uno**

---

# 8. Territorial Exclusivity

A territory may have a configurable number of partners.

Example:

```text
Marikina City
Distributor Slots: 1
```

If the maximum is one:

> Only one active Distributor may occupy Marikina City.

If the administrator changes the allowed number to:

```text
Distributor Slots: 2
```

the system may allow two active distributors in that territory.

Therefore, exclusivity must be **configuration-driven**, not permanently hard-coded.

---

# 9. Territory Structure

The system should support hierarchical geographic relationships:

```text
PHILIPPINES
    ↓
REGION
    ↓
CITY / MUNICIPALITY
    ↓
BARANGAY
```

Partner assignments follow the appropriate geographic level:

```text
Franchise
    ↓
Region

Distributor
    ↓
City / Municipality

Reseller
    ↓
Barangay
```

---

# 10. Example Territory

```text
NCR
│
├── Marikina City
│   │
│   ├── Barangay A
│   │   ├── Reseller 1
│   │   └── Reseller 2
│   │
│   ├── Barangay B
│   │   └── Reseller 3
│   │
│   └── Distributor
│       └── Distributor Maria
│
├── Quezon City
│   └── Distributor
│
└── Pasig City
    └── Distributor
```

The system should allow administrators to define how many partners may exist within each territory.

---

# 11. Territorial Management

Admin must be able to:

- View territories
- Assign a franchise to a region
- Assign distributors to cities
- Assign resellers to barangays
- Set territory capacity
- Increase/decrease allowed partner count
- View occupied territories
- View vacant territories
- View pending applications
- View active partners
- Change assignments
- Suspend a territorial assignment

Historical orders must retain the partner assignment applicable at the time of the order.

---

# 12. Philippines Territory Map

The Admin Panel should include a visual geographic planning interface.

### Map objective

Allow Lean & Fit management to visually understand:

- Franchise coverage
- Distributor coverage
- Reseller coverage
- Vacant territories
- Territory capacity
- Occupied territories
- Partner density

---

# 13. Map Visualization

The preferred interface is an interactive map of the Philippines.

Example conceptual hierarchy:

```text
PHILIPPINES
   ↓
Select Region
   ↓
NCR
   ↓
Select City
   ↓
Marikina City
   ↓
View Barangays
```

Territories can be visually differentiated based on status.

Example:

- Active franchise territory
- Active distributor territory
- Active reseller territory
- Available territory
- Full territory
- Pending territory

The exact colors should be determined during UI design.

---

# 14. Map Interactions

Admin should be able to:

- Zoom
- Pan
- Select region
- Select city
- Select barangay
- View partner assigned
- View territory capacity
- View available slots
- View partner type
- View territory status

Selecting a territory should display relevant information.

Example:

> **Marikina City**
>
> Distributor Capacity: 1  
> Active Distributors: 1  
> Available Slots: 0  
> Distributor: Maria Santos  
> Region: NCR  
> Status: Occupied

---

# 15. Partner Onboarding

The customer-facing website must include:

**BECOME A RESELLER**

This CTA should lead to the Lean & Fit partner application/onboarding page.

Although the button says "Become a Reseller," the application process should allow the applicant to select the desired partner type/package.

---

# 16. Partner Application Information

Applicant provides:

- Full name
- Email
- Contact number
- Contact details
- Address
- Region
- City/Municipality
- Barangay
- Desired partner type

Additional information may be collected depending on Lean & Fit's final onboarding requirements.

---

# 17. Partner Packages

To officially join the Lean & Fit partner economy, the applicant must select a package.

### Reseller

**10 Boxes**

Each box:

**10 sachets**

Total:

**100 sachets**

Includes:

**20% Reseller Partner Pricing**

---

### Distributor

**30 Boxes**

Each box:

**10 sachets**

Total:

**300 sachets**

Includes:

**30% Distributor Partner Pricing**

---

### Franchise

**40 Boxes**

Each box:

**10 sachets**

Total:

**400 sachets**

Includes:

**40% Franchise Partner Pricing**

---

# 18. Package Payment and Verification

The onboarding process should follow:

```text
Application
    ↓
Select Partner Type
    ↓
Select Package
    ↓
Payment
    ↓
Payment Verification
    ↓
Approved
    ↓
Partner Account Activated
```

A user does not become an official partner merely by submitting an application.

Partner status becomes active only after:

1. Required information is submitted
2. Appropriate package is selected
3. Payment is received
4. Payment is verified
5. Application is approved
6. Territory is successfully assigned where applicable

---

# 19. Territory Availability During Application

Before allowing an applicant to complete onboarding for a territorial partner type, the system should check territory availability.

Example:

Maria applies to become:

**Distributor**

Territory:

**Marikina City**

Configured capacity:

**1 Distributor**

Current active distributors:

**1**

Result:

> Marikina City currently has no available Distributor slot.

The system should not assign Maria as an active distributor unless an administrator increases capacity or releases the existing territory.

---

# 20. Partner Account Activation

Once approved, the system creates/activates the appropriate partner account.

The account contains:

- Partner ID
- Partner type
- Partner tier
- Territory
- Referral code
- Referral URL
- QR code
- Account status
- Package
- Partner pricing
- Parent partner
- Date activated

---

# 21. Partner Hierarchy Relationship

Every partner should have a relationship to the partner immediately above them where applicable.

Example:

```text
Franchise: Ana
Region: NCR

        ↓

Distributor: Maria
City: Marikina

        ↓

Reseller: Juan
Barangay: Concepcion Uno
```

The system should store these relationships.

---

# 22. Parent Partner

A partner's parent is the upstream partner responsible for supplying/fulfilling that partner's orders where applicable.

Example:

```text
Reseller
Parent:
Marikina Distributor

Distributor
Parent:
NCR Franchise

Franchise
Parent:
Lean & Fit Management
```

---

# 23. Missing Partner Rule

The hierarchy must support missing levels.

If an expected partner type does not exist, the system must automatically route the relationship/order to the next available higher level.

Example:

```text
Retail Customer
      ↓
Reseller
      ↓
NO DISTRIBUTOR
      ↓
Franchise
      ↓
Lean & Fit
```

The order does not fail simply because the Distributor level is vacant.

---

# 24. Example: Missing Distributor

Marikina has:

**Reseller: Juan**

But no Distributor.

NCR has:

**Franchise: Ana**

Therefore:

```text
Retail Customer
      ↓
Juan - Reseller
      ↓
Ana - Franchise
      ↓
Lean & Fit
```

The system should skip the missing Distributor.

---

# 25. Unique Referral Identity

Every partner must receive:

- Unique referral code
- Unique referral URL
- Unique QR code

Example:

```text
Partner:
Maria

Referral Code:
MARIA

Referral URL:
leanandfit.ph/maria
```

The actual referral code should be system-generated and guaranteed to be unique.

---

# 26. Referral Attribution

A referral URL identifies the partner responsible for the customer/order.

Example:

```text
leanandfit.ph/maria
```

Customer enters through Maria's link.

The system records:

**Referral Partner = Maria**

The attribution must persist through:

- Website browsing
- Product viewing
- Checkout
- Payment
- Order creation

The final order must retain the attributed partner.

---

# 27. Reseller Dropship Scenario

A Reseller sends their referral link to a retail customer.

Customer purchases directly from the Lean & Fit website.

Example:

```text
Retail Price:
₱380

Reseller Tier:
20%

Reseller Earnings:
₱76
```

Lean & Fit fulfills the order.

The reseller does not physically fulfill the order.

The **₱76 partner earning becomes payable to the reseller** according to Lean & Fit's payout process.

---

# 28. Distributor Referral Scenario

A Distributor sends their referral link to a Reseller.

The Reseller purchases through the Distributor's referral.

Example:

```text
SRP:
₱380

Reseller Price:
₱304

Distributor Price:
₱266

Distributor Margin:
₱38
```

The Reseller receives their 20% pricing.

The Distributor retains the difference between the Distributor price and Reseller price:

**₱304 - ₱266 = ₱38**

This represents the Distributor's earnings from supplying the Reseller.

---

# 29. Franchise Referral Scenario

A Franchise sends their referral link to a Distributor.

The Distributor purchases through the Franchise's referral.

Example:

```text
SRP:
₱380

Distributor Price:
₱266

Franchise Price:
₱228

Franchise Margin:
₱38
```

The Distributor receives their 30% pricing.

The Franchise retains:

**₱266 - ₱228 = ₱38**

as the Franchise's earnings from supplying the Distributor.

---

# 30. Order Hierarchy

The system must maintain:

```text
RETAIL CUSTOMER
      ↓
RESELLER
      ↓
DISTRIBUTOR
      ↓
FRANCHISE
      ↓
LEAN & FIT MANAGEMENT
```

Orders should move through the appropriate upstream partner.

---

# 31. Order Fulfillment Responsibility

### Retail customer

May purchase from:

- Reseller
- Distributor
- Franchise
- Lean & Fit where applicable

The order is attributed to the appropriate partner.

### Reseller

Orders go through their assigned Distributor where one exists.

### Distributor

Orders go through their assigned Franchise where one exists.

### Franchise

Orders go through Lean & Fit Management.

---

# 32. Manual Fulfillment vs Dropshipping

Every partner level must support two fulfillment methods:

### Manual Fulfillment

The partner physically fulfills the order from their own inventory.

### Lean & Fit Dropship

The partner requests the upstream entity to fulfill and ship the order on their behalf.

---

# 33. Inventory Ownership

Partners may maintain their own inventory.

A partner can:

- Purchase stock
- Hold stock
- Sell from their own stock
- Fulfill orders manually

Alternatively, the partner can use Lean & Fit dropshipping.

The Phase 2 architecture should therefore distinguish:

**Order Attribution**

from:

**Order Fulfillment**

These are not necessarily the same entity.

---

# 34. Order Attribution vs Fulfillment

Example:

Maria, Reseller, receives the customer.

Customer purchases:

**₱380**

Maria is the:

**Sales/Referral Partner**

But Lean & Fit fulfills the order.

Therefore:

```text
Sales Attribution:
Maria - Reseller

Fulfillment:
Lean & Fit Management

Partner Earnings:
₱76
```

The system must preserve both pieces of information.

---

# 35. Order Routing Logic

When an order is created:

```text
Identify Customer
       ↓
Identify Referral Partner
       ↓
Identify Partner Tier
       ↓
Identify Partner Territory
       ↓
Identify Parent Partner
       ↓
Determine Highest Available Upstream Partner
       ↓
Determine Fulfillment Method
       ↓
Route Order
```

---

# 36. Parent Partner Routing

### Reseller

If Distributor exists:

```text
Reseller → Distributor
```

If no Distributor:

```text
Reseller → Franchise
```

If no Franchise:

```text
Reseller → Lean & Fit
```

### Distributor

If Franchise exists:

```text
Distributor → Franchise
```

If no Franchise:

```text
Distributor → Lean & Fit
```

### Franchise

```text
Franchise → Lean & Fit
```

---

# 37. Dropship Order Flow

Example:

Retail customer purchases through Reseller Maria.

Maria chooses Lean & Fit dropshipping.

```text
Customer
    ↓
Maria - Reseller
    ↓
Lean & Fit Dropship Request
    ↓
Lean & Fit Admin
    ↓
Packing
    ↓
Shipping
    ↓
Customer
```

The order remains attributed to Maria.

---

# 38. Partner-Fulfilled Order Flow

If Maria has stock:

```text
Customer
    ↓
Maria - Reseller
    ↓
Maria fulfills
    ↓
Customer
```

The system records Maria as the fulfillment party.

---

# 39. Dropship Order Management

If a partner chooses dropshipping, the order should enter the relevant upstream Order Management System.

Example:

### Reseller

```text
Reseller Order
      ↓
Distributor Order Management
```

If Distributor is absent:

```text
Reseller Order
      ↓
Franchise Order Management
```

If Franchise is absent:

```text
Reseller Order
      ↓
Lean & Fit Admin Order Management
```

---

# 40. Partner Dashboard

All three partner types receive a dashboard.

The dashboard menu must contain:

```text
CLIENT ORDERS
MY ORDERS
CUSTOMERS
COMMISSION
MARKETING MATERIALS
```

The term **COMMISSION** may be retained in the user interface because this is the client's requested terminology.

Internally, the system should distinguish between:

- Partner pricing
- Partner margin
- Referral earnings
- Payable commission

---

# 41. Client Orders

**Client Orders** displays orders generated through the partner's unique referral link or assigned downstream relationship that require the partner's action.

The partner should see:

- Order ID
- Customer
- Products
- Quantity
- Order amount
- Order date
- Payment status
- Fulfillment method
- Fulfillment status
- Required action

Example:

> **Order #LF1024**
>
> Customer: John Cruz  
> Total: ₱1,520  
> Fulfillment: Manual  
> Status: For Fulfillment
>
> **[ ACCEPT ] [ MARK AS FULFILLED ]**

---

# 42. My Orders

Displays orders personally placed by the logged-in partner.

Example:

- Order ID
- Date
- Products
- Quantity
- Partner price
- Total
- Payment status
- Order status
- Fulfillment

---

# 43. Customers

The Customers section acts as the partner's customer phonebook.

It may display:

- Customer name
- Contact details
- Number of orders
- Total purchases
- Most recent order
- Referral relationship

A partner must only see customers they are authorized to access.

---

# 44. Commission / Earnings

The **COMMISSION** section displays money payable to the partner.

It should show:

- Total earnings
- Pending earnings
- Approved earnings
- Paid earnings
- Earnings history
- Related order
- Earnings source

Example:

```text
Order #LF1024
Retail Sale: ₱380
Partner: Maria - Reseller
Earnings: ₱76
Status: Pending
```

For upstream partner earnings:

```text
Order #LF1030
Reseller Purchase Price: ₱304
Distributor Price: ₱266
Distributor Earnings: ₱38
Status: Payable
```

---

# 45. Marketing Materials

The Marketing Materials section is a simple resource area.

It should provide access to the official Lean & Fit marketing materials.

Initial implementation:

**Google Drive link**

The portal may display:

> **Marketing Materials**
>
> Access official Lean & Fit product photos, promotional materials, and approved marketing creatives.
>
> **[ OPEN MARKETING MATERIALS ]**

The Google Drive destination should be configurable by Admin.

---

# 46. Partner-Specific Dashboard Data

The dashboard should adapt based on the authenticated partner.

### Reseller

Display:

- Reseller sales
- Reseller earnings
- Orders
- Customers
- Territory
- Parent Distributor/Franchise
- Referral link
- QR

### Distributor

Display:

- Distributor sales
- Downstream Reseller activity
- Distributor earnings
- Orders
- Customers
- Territory
- Parent Franchise
- Referral link
- QR

### Franchise

Display:

- Franchise sales
- Downstream Distributor activity
- Franchise earnings
- Orders
- Customers
- Territory
- Referral link
- QR

---

# 47. Partner Referral QR

Each partner receives a QR code tied to their referral URL.

Example:

```text
Maria
    ↓
leanandfit.ph/maria
    ↓
QR Code
```

Customer scans:

```text
SCAN
 ↓
LEAN & FIT WEBSITE
 ↓
PRODUCT
 ↓
CHECKOUT
 ↓
ORDER
 ↓
MARIA ATTRIBUTION
```

---

# 48. Referral Attribution Rules

Referral attribution must be securely associated with the order.

The system must not rely solely on a visible referral code submitted during checkout.

The attribution should persist through the customer journey and be validated when the order is created.

An order should store:

- Referral partner
- Referral code
- Referral partner type
- Partner territory
- Parent partner at transaction time
- Fulfillment party
- Fulfillment method

---

# 49. Missing Partner Logic

The system must automatically skip unavailable hierarchy levels.

### Example

```text
Retail Customer
      ↓
Reseller
      ↓
NO DISTRIBUTOR
      ↓
Franchise
      ↓
Lean & Fit
```

The reseller should still be able to sell.

The absence of a Distributor must not prevent the transaction.

---

# 50. Territory + Hierarchy Example

### NCR Franchise

**Ana**

↓

### Marikina Distributor

**Maria**

↓

### Concepcion Uno Reseller

**Juan**

↓

### Retail Customer

**Customer**

Order flow:

```text
Customer
   ↓
Juan
   ↓
Maria
   ↓
Ana
   ↓
Lean & Fit
```

If Maria does not exist:

```text
Customer
   ↓
Juan
   ↓
Ana
   ↓
Lean & Fit
```

If Ana does not exist:

```text
Customer
   ↓
Juan
   ↓
Lean & Fit
```

---

# 51. Partner Tier Visibility

A logged-in partner must only see pricing applicable to their assigned tier.

### Reseller

Sees:

**20% partner pricing**

### Distributor

Sees:

**30% partner pricing**

### Franchise

Sees:

**40% partner pricing**

The system may show an upgrade opportunity.

Example:

> **You're currently a Reseller.**
>
> Upgrade to Distributor and unlock **30% partner pricing**.
>
> **[ LEARN MORE ]**

A partner must never be able to obtain a higher-tier price merely by manipulating the frontend.

All pricing must be validated server-side.

---

# 52. Partner Upgrade Path

The standard progression is:

```text
RESELLER
    ↓
DISTRIBUTOR
    ↓
FRANCHISE
```

Upgrade requests should require Lean & Fit approval unless an automated approval workflow is later introduced.

---

# 53. Package and Partner Tier Relationship

The initial packages correspond to:

```text
10 Boxes
    ↓
Reseller
    ↓
20% Pricing

30 Boxes
    ↓
Distributor
    ↓
30% Pricing

40 Boxes
    ↓
Franchise
    ↓
40% Pricing
```

The system must associate the approved package with the resulting partner tier.

---

# 54. Order Data Model Principle

Every order should be capable of recording:

```text
ORDER
├── Customer
├── Products
├── Retail Value
├── Partner Price
├── Payment
├── Referral Partner
├── Partner Type
├── Parent Partner
├── Territory
├── Fulfillment Party
├── Fulfillment Method
├── Order Status
├── Payment Status
└── Partner Earnings
```

This is essential because **the partner receiving the sale and the partner fulfilling the sale may be different entities.**

---

# 55. Historical Integrity

Partner hierarchy and territory changes must not rewrite historical transactions.

If Maria was the Distributor of Marikina when an order was placed, that order must retain Maria as the Distributor even if the territory is later assigned to another Distributor.

Likewise, the system must retain:

- Partner tier at transaction time
- Partner pricing at transaction time
- Referral partner
- Parent partner
- Territory
- Fulfillment party
- Earnings calculation

---

# 56. Admin Territory Management

Admin should be able to:

- Create/manage territories
- Assign regions
- Assign cities
- Assign barangays
- Set partner capacity
- Assign partners
- Remove partners
- Suspend partners
- View vacant territories
- View occupied territories
- View partner density
- View territory hierarchy

---

# 57. Admin Partner Management

Admin should be able to:

- View all partners
- Approve applications
- Verify package payment
- Activate accounts
- Assign partner type
- Assign territory
- Assign parent partner
- Suspend accounts
- Change territory
- Change partner type
- View referral performance
- View earnings
- View orders
- View customers

All significant changes must be recorded in the audit trail.

---

# 58. Territorial Capacity Rules

Each territory should have a configurable capacity.

Example:

```text
Marikina City
Distributor Capacity:
1
```

or:

```text
Marikina City
Distributor Capacity:
2
```

For barangays:

```text
Concepcion Uno
Reseller Capacity:
3
```

The system should prevent administrators from accidentally exceeding the configured capacity unless an explicit override is available.

Any override should be audited.

---

# 59. Map-Based Strategy Planning

The Philippines map should become a strategic planning tool, not merely a decorative visualization.

Admin should be able to identify:

- Where Lean & Fit currently has coverage
- Where there are no partners
- Which regions have franchises
- Which cities have distributors
- Which barangays have resellers
- Territory capacity
- Partner density
- Potential expansion areas

---

# 60. Security & Access Control

### Retail Customer

Can:

- Browse products
- Purchase
- Track own orders

### Reseller

Can access:

- Own dashboard
- Assigned Client Orders
- Own Orders
- Own Customers
- Own Earnings
- Marketing Materials
- Own referral link
- Own QR

### Distributor

Can access:

- Own dashboard
- Downstream order activity they are responsible for
- Own Orders
- Authorized Customers
- Own Earnings
- Marketing Materials
- Own referral link
- Own QR

### Franchise

Can access:

- Own dashboard
- Downstream order activity they are responsible for
- Own Orders
- Authorized Customers
- Own Earnings
- Marketing Materials
- Own referral link
- Own QR

### Admin

Has full management access according to administrative permissions.

---

# 61. Non-Negotiable Development Rules

1. **Partner pricing is determined by the authenticated user's assigned tier.**
2. **Never allow a partner to select a higher-tier price through frontend manipulation.**
3. **Partner pricing must be validated server-side.**
4. **Do not treat Reseller, Distributor, and Franchise discounts as generic commissions.**
5. **Partner margin and payable referral earnings must be tracked separately.**
6. **Every partner must have a unique referral identity.**
7. **Every partner referral must be attributable to an order.**
8. **Orders must distinguish sales attribution from fulfillment responsibility.**
9. **Orders must support manual fulfillment and dropshipping.**
10. **Missing hierarchy levels must be skipped automatically.**
11. **Territorial capacity must be configurable.**
12. **Territorial exclusivity must be enforced according to configured capacity.**
13. **Historical orders must retain the partner relationships and pricing applicable at the time of the transaction.**
14. **Partners must only access customers and orders they are authorized to see.**
15. **Partner tier changes must not rewrite historical transactions.**
16. **Partner upgrades require explicit approval unless a separate automated workflow is implemented.**
17. **All important partner, territory, pricing, order, and earnings changes must be auditable.**
18. **The map must reflect the same territory data used by the partner management system.**
19. **The referral URL and QR must point to the same unique partner identity.**
20. **The system must never rely solely on frontend referral attribution.**

---

# 62. Phase 2 Acceptance Criteria

The system is considered functionally complete when:

### Partner Onboarding

- Customer can click Become a Reseller.
- Customer can apply for a partner account.
- Customer can select Reseller, Distributor, or Franchise.
- Customer can select the corresponding package.
- Payment can be recorded and verified.
- Admin can approve the applicant.
- Partner account becomes active.
- Partner receives their appropriate tier.
- Partner receives a unique referral identity.

### Territory

- Admin can assign a Franchise to a region.
- Admin can assign a Distributor to a city.
- Admin can assign Resellers to barangays.
- Admin can configure territory capacity.
- System prevents unauthorized over-allocation.
- Admin can visually inspect territories through the Philippines map.

### Pricing

- Reseller receives 20% pricing.
- Distributor receives 30% pricing.
- Franchise receives 40% pricing.
- Logged-in partners only see their applicable tier price.
- Higher-tier pricing cannot be obtained through frontend manipulation.

### Referral

- Every partner has a unique referral link.
- Every partner has a QR code.
- Customer entering through the link is attributed correctly.
- Attribution survives through checkout and order creation.

### Hierarchy

- Reseller routes to Distributor when available.
- Distributor routes to Franchise when available.
- Franchise routes to Lean & Fit.
- Missing partner levels are automatically skipped.

### Fulfillment

- Partners can fulfill from their own stock.
- Partners can request dropshipping.
- Dropship orders reach the correct upstream Order Management System.
- Lean & Fit can fulfill orders when required.
- Sales attribution and fulfillment responsibility are stored separately.

### Earnings

- Reseller earnings can be calculated.
- Distributor upstream earnings can be calculated.
- Franchise upstream earnings can be calculated.
- Earnings are tied to the appropriate transaction.
- Payable earnings are visible in the partner's Commission section.

### Dashboard

Every partner can access:

```text
CLIENT ORDERS
MY ORDERS
CUSTOMERS
COMMISSION
MARKETING MATERIALS
```

### Marketing

- Marketing Materials links to the approved Google Drive destination.
- Admin can manage the destination where required.

---

# 63. Core Business Model

The entire system should ultimately represent this structure:

```text
                    LEAN & FIT MANAGEMENT
                            │
                       40% PARTNER
                            │
                      FRANCHISE
                       Regional
                            │
                       30% PARTNER
                            │
                     DISTRIBUTOR
                      Per City
                            │
                       20% PARTNER
                            │
                      RESELLER
                    Per Barangay
                            │
                         RETAIL
                        CUSTOMER
```

The commercial flow is:

```text
LEAN & FIT
    ↓
FRANCHISE
    ↓
DISTRIBUTOR
    ↓
RESELLER
    ↓
RETAIL CUSTOMER
```

The sales/referral flow may operate in the opposite direction:

```text
RETAIL CUSTOMER
    ↓
RESELLER
    ↓
DISTRIBUTOR
    ↓
FRANCHISE
    ↓
LEAN & FIT
```

The fulfillment flow can vary depending on inventory and dropship settings.

---

# 64. Final Architecture Principle

Lean & Fit Phase 2 is fundamentally a:

> **Territorial, hierarchical partner distribution and order-routing system.**

It is not simply an affiliate system and it is not simply a reseller dashboard.

The system must understand five separate concepts:

```text
1. WHO SOLD THE PRODUCT?
        ↓
Referral / Sales Attribution

2. WHO OWNS THE TERRITORY?
        ↓
Territorial Assignment

3. WHO GETS WHAT PRICE?
        ↓
Partner Pricing Tier

4. WHO IS RESPONSIBLE FOR FULFILLING?
        ↓
Fulfillment Responsibility

5. WHO IS OWED MONEY?
        ↓
Partner Earnings / Payable Commission
```

These must remain separate in the underlying architecture while working together to produce the Lean & Fit business workflow.

The central relationship is:

```text
PARTNER
   │
   ├── Partner Type
   │       ├── Reseller
   │       ├── Distributor
   │       └── Franchise
   │
   ├── Territory
   │       ├── Barangay
   │       ├── City
   │       └── Region
   │
   ├── Parent Partner
   │
   ├── Partner Pricing
   │
   ├── Referral Identity
   │       ├── Referral Code
   │       ├── Referral URL
   │       └── QR Code
   │
   ├── Inventory
   │
   ├── Orders
   │
   └── Earnings
```

This structure should be treated as the foundation of the Lean & Fit Phase 2 Partner Portal and territorial distribution system.