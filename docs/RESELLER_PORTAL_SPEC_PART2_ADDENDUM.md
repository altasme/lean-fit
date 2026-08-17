> Uploaded 2026-08-17 alongside `RESELLER_PORTAL_SPEC_PART1.md`. Build
> started with Part 1 only per explicit instruction; Part 1 (Phases A-H)
> shipped first, Part 2 followed once explicitly requested. See
> `supabase/README.md`'s "Reseller Portal Part 2" section for the full
> scope decision and what's built vs. deliberately not.
>
> **Scoped down, confirmed with the user before starting:** built -
> partner-assisted onboarding (§1 Route B, §2-10, §28-30, migration
> `0011_partner_assisted_onboarding.sql`, `/reseller/add-partner`) with
> real permission-matrix + territorial-containment + capacity enforcement;
> `orders.fulfillment_method` (this doc's recommended field, §33) added
> with a fixed `lean_and_fit_dropship` default; `admin_users.role`
> groundwork for Staff Admin (§6/§31) with no enforcement logic, matching
> this doc's own "exact matrix defined in a future phase" framing.
> **Not built** - partner-run manual fulfillment/inventory tracking
> (§12-18, §33's "private inventory sale" concept - no inventory system
> exists anywhere in this app, and per §33's own allowance, "partner-
> fulfilled orders may be completely absent from the centralized order
> system if that is the intended business process," which is the path
> taken: every website order is a Lean & Fit dropship order by
> construction, so there is no alternative fulfillment method to build a
> UI toggle for); automated hierarchical order-routing for retail
> checkout (§25-27, unrelated to onboarding - Part 1 Phase E's fulfillment
> scope note still applies); Staff Admin's actual permission matrix
> (§31, explicitly deferred by this doc itself).

# Lean & Fit Phase 2
## Partner Onboarding, Dropshipping & Order Visibility Addendum

This addendum modifies and extends the Phase 2 Partner Distribution and Reseller Portal specification.

---

# 1. Partner Economy Entry Points

A person may enter the Lean & Fit partner economy through two primary routes:

### Route A — Direct Application

The individual applies through the public:

**BECOME A RESELLER**

page.

They:

1. Submit their information.
2. Select a partner package.
3. Complete payment through Lean & Fit Management.
4. Payment is verified.
5. Application is approved.
6. Partner account is activated.
7. Territory is assigned where applicable.

---

### Route B — Partner-Assisted Onboarding

An existing authorized partner may onboard another person by purchasing the appropriate partner package **on that person's behalf**.

Example:

```text id="6g83rt"
Distributor Maria
       ↓
Adds new Reseller Juan
       ↓
Maria purchases Reseller Package
       ↓
Lean & Fit Management receives payment
       ↓
Payment verified
       ↓
Juan becomes an official Reseller
```

The newly onboarded partner must still have their own account and partner identity.

The purchasing partner is recorded as the **onboarding partner / sponsor**.

---

# 2. Partner Onboarding Permissions

Partner onboarding permissions are hierarchical.

| Account Type | Can Add Reseller | Can Add Distributor | Can Add Franchise |
|---|---:|---:|---:|
| Reseller | ❌ | ❌ | ❌ |
| Distributor | ✅ | ❌ | ❌ |
| Franchise | ✅ | ✅ | ❌ |
| Admin | ✅ | ✅ | ✅ |

The system must enforce these permissions.

---

# 3. Reseller Onboarding Permission

A Reseller cannot onboard another partner.

The Reseller may:

- Refer potential partners to Lean & Fit
- Share the public partner application
- Share their appropriate information

But the Reseller cannot directly create or purchase a partner package for another person through the partner portal.

---

# 4. Distributor Onboarding Permission

A Distributor may onboard:

**Resellers only.**

A Distributor cannot directly onboard:

- Another Distributor
- Franchise

Example:

```text id="w9a5cl"
Distributor Maria
       ↓
Can onboard
       ↓
Reseller Juan
```

The system must prevent Maria from selecting Distributor or Franchise as the new partner type.

---

# 5. Franchise Onboarding Permission

A Franchise may onboard:

- Resellers
- Distributors

A Franchise cannot onboard another Franchise.

Example:

```text id="i1j7ma"
Franchise Ana
       ├── Distributor Maria
       ├── Distributor Pedro
       └── Reseller Juan
```

The Franchise can create either applicable partner type, subject to territory availability and Lean & Fit approval requirements.

---

# 6. Admin Onboarding Permission

Administrators have the highest onboarding authority.

Admin can create:

- Reseller
- Distributor
- Franchise
- Staff Admin

### Staff Admin

A Staff Admin account may have restricted permissions.

Initial concept:

```text id="0sn7cl"
ADMIN
  ↓
FULL ACCESS

STAFF ADMIN
  ↓
LIMITED ACCESS
```

The exact Staff Admin permission matrix will be defined in a future phase.

For Phase 2, the system should therefore support a role/permission architecture capable of restricting Staff Admin access later.

Do not hard-code every administrative account as having identical privileges.

---

# 7. Partner-Assisted Onboarding Flow

Partner-assisted onboarding must follow:

```text id="c5um2e"
AUTHORIZED PARTNER
        ↓
SELECT "ADD PARTNER"
        ↓
SELECT ELIGIBLE PARTNER TYPE
        ↓
ENTER NEW PARTNER INFORMATION
        ↓
SELECT PARTNER PACKAGE
        ↓
PAYMENT
        ↓
LEAN & FIT MANAGEMENT
        ↓
PAYMENT VERIFICATION
        ↓
APPROVAL
        ↓
PARTNER ACCOUNT ACTIVATED
```

The newly created partner must be linked to the partner who onboarded them.

---

# 8. Onboarding Relationship

The system must record:

**Onboarded By**

Example:

```text id="5e94ru"
New Partner:
Juan Santos

Partner Type:
Reseller

Onboarded By:
Maria Santos

Onboarding Partner Type:
Distributor
```

This relationship must be retained for administrative and audit purposes.

---

# 9. Partner Onboarding Does Not Bypass Lean & Fit Payment Processing

Partners cannot independently collect or process the payment for another partner package through their own payment account.

The actual package payment must go through:

**Lean & Fit Management**

The onboarding partner is effectively sponsoring/purchasing the package on behalf of the new partner, but Lean & Fit remains the payment recipient and verifier.

---

# 10. Partner Onboarding Through Dropshipping

The partner onboarding workflow must use the same Lean & Fit-controlled payment/order infrastructure.

Partners should not create an independent payment gateway transaction for the package.

The intended flow is:

```text id="q5zv0m"
Partner
   ↓
Adds New Partner
   ↓
Selects Package
   ↓
Lean & Fit Checkout
   ↓
Payment
   ↓
Lean & Fit Verification
   ↓
Partner Package Fulfillment
   ↓
New Partner Activated
```

---

# 11. Important Distinction: Partner Onboarding vs Product Sales

The system must distinguish:

### Partner Package Purchase

Used to activate a new partner.

### Retail Product Order

A customer buying Lean & Fit products.

### Partner Stock Purchase

A partner purchasing stock for their own inventory.

These should not be treated as the same transaction type.

---

# 12. Order Visibility Rule

A critical Phase 2 rule:

> **Only orders that are processed through Lean & Fit Management via dropshipping are recorded and visible in the relevant Order Management System.**

Orders fulfilled directly from a partner's own inventory are outside the Lean & Fit online order-management workflow.

---

# 13. Manual Partner-Fulfilled Orders

When a partner fulfills an order using their own inventory:

```text id="z3uy8g"
Retail Customer
       ↓
Partner
       ↓
Partner's Own Inventory
       ↓
Customer
```

The transaction does **not** enter the Lean & Fit Order Management System.

Therefore:

- It is not displayed as a Client Order.
- It is not displayed as a Lean & Fit dropship order.
- It is not routed through the upstream partner's Order Management System.
- Lean & Fit does not manage its fulfillment status.

The partner is responsible for the transaction independently.

---

# 14. Dropship Orders

If the partner chooses:

**DROP SHIP**

the transaction becomes a Lean & Fit-managed order.

Example:

```text id="8ys10j"
Retail Customer
       ↓
Reseller
       ↓
SELECTS DROPSHIP
       ↓
LEAN & FIT MANAGEMENT
       ↓
ORDER MANAGEMENT
       ↓
PACKING
       ↓
SHIPPING
       ↓
RETAIL CUSTOMER
```

This order is recorded in the platform.

---

# 15. Core Order Flow

The primary dropship flow is:

```text id="lq7ep2"
RETAIL CUSTOMER
       ↓
RESELLER
       ↓
RESELLER REFERRAL LINK
       ↓
LEAN & FIT WEBSITE
       ↓
CHECKOUT
       ↓
PAYMENT
       ↓
RESELLER SELECTS / REQUESTS DROPSHIP
       ↓
LEAN & FIT MANAGEMENT
       ↓
PACK & SHIP
       ↓
RETAIL CUSTOMER
```

The order remains attributed to the Reseller.

---

# 16. Reseller Dropship Example

Maria is a Reseller.

Her partner pricing:

**20% below SRP**

She sends her referral link to a retail customer.

The customer purchases:

**₱380**

Maria's applicable earning:

**₱76**

Maria does not have stock available.

She requests:

**Dropship by Lean & Fit**

The order is then sent to Lean & Fit Management.

Lean & Fit:

1. Receives the order.
2. Verifies payment.
3. Packs the order.
4. Ships the order.
5. Updates the order status.
6. Records the applicable partner earning.

---

# 17. Partner-Fulfilled Example

Maria has inventory.

The customer purchases from Maria directly.

Maria fulfills:

```text id="nknr3j"
Customer
   ↓
Maria
   ↓
Maria's Inventory
   ↓
Customer
```

This transaction does **not** enter the Lean & Fit online Order Management System.

The system should not falsely show Lean & Fit as having fulfilled or shipped this order.

---

# 18. Order Attribution vs Order Visibility

The system must distinguish:

### Sales Attribution

Who generated the sale?

### Order Visibility

Who is managing the order inside the Lean & Fit system?

### Fulfillment

Who physically fulfills the order?

These are separate concepts.

Example:

```text id="0gppn6"
Sales Attribution:
Maria - Reseller

Order Management:
Lean & Fit

Fulfillment:
Lean & Fit

Fulfillment Method:
Dropship
```

---

# 19. Client Orders

The **CLIENT ORDERS** dashboard should display only orders requiring action through the Lean & Fit-managed dropshipping workflow.

For a Reseller:

> Orders attributed to the reseller that are being processed through the managed dropship workflow.

For a Distributor:

> Orders involving their downstream network that have been routed to them for action through the managed workflow.

For a Franchise:

> Orders routed to them through the managed hierarchy.

Orders fulfilled privately from partner inventory should not appear as active Client Orders.

---

# 20. My Orders

**MY ORDERS** remains the partner's own purchases.

This is separate from:

**CLIENT ORDERS**

and should contain orders where the logged-in partner is the purchasing party.

---

# 21. Customers

The **CUSTOMERS** section should represent customers associated with the partner's Lean & Fit-managed sales/referral activity.

Because privately fulfilled orders do not enter the Lean & Fit order system, they cannot automatically appear in the centralized customer history.

The system must not claim to know about transactions that were never submitted through Lean & Fit Management.

---

# 22. Commission / Earnings

The **COMMISSION** section should display only earnings that Lean & Fit can calculate and recognize from transactions processed through the system.

For example:

### Dropship sale

```text id="6q5e6t"
Retail Sale:
₱380

Reseller:
Maria

Reseller Earnings:
₱76

Status:
Pending
```

The system can track the amount payable because Lean & Fit processed the order.

---

# 23. Private Inventory Sales

A partner's private/manual sales are not automatically recorded in the Lean & Fit platform.

Therefore:

- They do not automatically create payable commission records.
- They do not appear as Lean & Fit-managed orders.
- They do not automatically update the partner's online sales statistics.
- They do not automatically appear in the partner's customer phonebook.

If Lean & Fit later wants partners to manually report these transactions, that should be introduced as a separate feature.

---

# 24. Partner Dashboard Metrics

Dashboard metrics should be clearly labeled based on **system-recorded activity**.

For example:

### Total Sales

Should represent sales recorded by the Lean & Fit system.

It should not imply that Lean & Fit knows the partner's complete offline sales unless those transactions have been separately reported.

### Orders

Should represent orders recorded in the system.

### Customers

Should represent customers recorded through the system.

### Earnings

Should represent calculated/pending/paid earnings recorded by the system.

---

# 25. Hierarchical Dropship Routing

The hierarchy remains:

```text id="n5n29m"
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

But the order only moves upward when the transaction is being fulfilled through the managed dropship workflow.

---

# 26. Reseller Dropship

```text id="bj0iqh"
Retail Customer
       ↓
Reseller
       ↓
DROP SHIP
       ↓
Distributor
       ↓
Franchise
       ↓
Lean & Fit
```

The system should determine the appropriate upstream route based on the territory hierarchy and availability.

If the Distributor is absent:

```text id="6h5diy"
Reseller
       ↓
NO DISTRIBUTOR
       ↓
Franchise
       ↓
Lean & Fit
```

If the Franchise is absent:

```text id="h2e9be"
Reseller
       ↓
Lean & Fit
```

---

# 27. Important Clarification on Fulfillment Routing

The system must not assume that every upstream partner physically receives the order.

The purpose of routing is to determine:

- Which partner relationship the transaction belongs to
- Which party may be responsible for fulfillment
- Whether Lean & Fit dropshipping is requested
- Which Order Management System should receive the managed order

The actual physical fulfillment method depends on the selected fulfillment option.

---

# 28. Partner Package Onboarding and Territory

When onboarding a Distributor or Franchise, territory availability must be checked.

Example:

A Distributor attempts to onboard a Reseller in:

**Marikina City → Barangay Concepcion Uno**

The system checks:

- Is there an available Reseller slot?
- Is the Distributor authorized to onboard a Reseller?
- Is the Distributor the appropriate territorial parent?
- Does the new Reseller satisfy the required package?

If valid, the onboarding may proceed to payment and verification.

---

# 29. Onboarding Permission + Territory Rule

Partner onboarding requires **both**:

1. Permission to onboard that partner type.
2. Availability/eligibility within the target territory.

Example:

A Distributor may technically add Resellers.

But if the selected barangay has reached its configured Reseller capacity:

> **The system must not activate the new Reseller in that territory unless an administrator increases capacity or provides an approved override.**

---

# 30. Partner Hierarchy and Onboarding

The normal structure remains:

```text id="q3n3d6"
FRANCHISE
   │
   ├── DISTRIBUTOR
   │      │
   │      ├── RESELLER
   │      ├── RESELLER
   │      └── RESELLER
   │
   └── DISTRIBUTOR
          │
          ├── RESELLER
          └── RESELLER
```

A Franchise can add:

- Distributor
- Reseller

A Distributor can add:

- Reseller

A Reseller can add:

- Nobody

Admin can add:

- Reseller
- Distributor
- Franchise
- Staff Admin

---

# 31. Staff Admin Role

The system must support role-based access control.

Initial roles:

- Admin
- Staff Admin
- Franchise
- Distributor
- Reseller
- Retail Customer

Staff Admin permissions should be configurable.

The initial implementation may provide limited access, with the architecture allowing additional permissions to be added later.

---

# 32. Payment Principle

Partner onboarding payments and dropship order payments are processed through **Lean & Fit Management's payment system**.

Partners do not operate their own payment gateways inside the platform.

The system should prepare for future payment gateway integration while initially supporting the agreed manual payment process.

---

# 33. Critical System Distinction

The platform must distinguish between:

### Offline / Partner Inventory Sale

```text
Partner → Customer
```

No Lean & Fit managed order.

### Lean & Fit Dropship Sale

```text
Partner → Lean & Fit → Customer
```

Lean & Fit managed order.

This distinction must exist at the data-model level.

Recommended field:

```text id="i1kjv7"
fulfillment_method

Values:
- PARTNER_FULFILLMENT
- LEAN_AND_FIT_DROPSHIP
```

However, partner-fulfilled orders may be completely absent from the centralized order system if that is the intended business process.

---

# 34. Non-Negotiable Rules

1. **Only authorized partner types can onboard another partner.**
2. **Resellers cannot onboard partners.**
3. **Distributors can onboard Resellers only.**
4. **Franchises can onboard Resellers and Distributors.**
5. **Admins can onboard any partner type and Staff Admin.**
6. **Partner onboarding payments must go through Lean & Fit Management.**
7. **Partners cannot independently process partner-package payments.**
8. **Partner-assisted onboarding must record who onboarded the new partner.**
9. **Territory availability must be checked before activating territorial partners.**
10. **Manual fulfillment from partner-owned inventory is outside the Lean & Fit Order Management System.**
11. **Only Lean & Fit dropship orders are recorded in the centralized managed order workflow.**
12. **Sales attribution and fulfillment responsibility must remain separate concepts.**
13. **A dropship order must identify the originating partner.**
14. **A dropship order must identify the fulfillment party.**
15. **Missing hierarchy levels must be skipped.**
16. **Partner earnings must only be calculated from system-recorded transactions unless a future manual-reporting feature is introduced.**
17. **Offline partner sales must not be falsely represented as Lean & Fit-managed sales.**
18. **Partner dashboards must clearly reflect system-recorded activity.**
19. **Partner referral links must maintain attribution through checkout.**
20. **Partner tier pricing must be validated server-side.**

---

# 35. Core Example

## Scenario

Juan is a Reseller in Marikina.

He sends his unique Lean & Fit referral link to Ana.

Ana wants to purchase Lean & Fit.

Juan does not have stock.

### Customer

Ana:

**BUY NOW**

↓

Places order

↓

Selects/uses Juan's referral

↓

Order is attributed to:

**Juan — Reseller**

↓

Juan chooses:

**DROPSHIP**

↓

Lean & Fit Management receives the order

↓

Lean & Fit verifies payment

↓

Lean & Fit packs order

↓

Lean & Fit ships to Ana

↓

Order completed

↓

Juan's system-recorded earnings are calculated

↓

Juan sees the transaction in:

**CLIENT ORDERS**

and:

**COMMISSION**

---

# 36. Manual Inventory Example

Juan has stock.

Ana orders directly from Juan.

Juan fulfills from his own inventory.

```text id="w8c9c5"
Ana
 ↓
Juan
 ↓
Juan's Stock
 ↓
Ana
```

This transaction does not enter the Lean & Fit managed Order Management System.

Juan remains responsible for fulfillment and the transaction is not automatically represented in Lean & Fit's centralized order statistics.

---

# 37. Final Business Model

The Phase 2 platform therefore represents two parallel commerce paths:

### Partner Inventory Commerce

```text id="h6i4k4"
LEAN & FIT
     ↓
PARTNER STOCK
     ↓
PARTNER
     ↓
RETAIL CUSTOMER
```

Managed operationally by the partner.

### Lean & Fit Dropship Commerce

```text id="z6xvqy"
LEAN & FIT
     ↓
PARTNER REFERRAL
     ↓
RETAIL CUSTOMER
     ↓
LEAN & FIT MANAGEMENT
     ↓
SHIPMENT
     ↓
RETAIL CUSTOMER
```

Managed operationally through the Lean & Fit platform.

The key architectural rule is:

> **The platform tracks and manages transactions that Lean & Fit is responsible for fulfilling. It does not attempt to represent private inventory sales that occur entirely outside the Lean & Fit order system.**

This keeps the Phase 2 system aligned with the client's actual operating model rather than pretending that every partner sale is an online Lean & Fit transaction.