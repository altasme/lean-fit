# Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor (or `supabase db push` if
   using the CLI with migrations). It creates the `orders` /
   `order_status_history` tables, RLS policies, the `create_order` RPC, and
   the private `payment-proofs` storage bucket + its policies.
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

## Why `create_order` is an RPC, not a direct anon INSERT

CLAUDE.md §11 describes the RLS as "orders: allow anon INSERT (checkout).
No anon SELECT/UPDATE." Implemented literally, checkout would insert
correctly but the client could never read back the new order's
`order_no`/`id` - Postgres applies the table's SELECT policy to the
`RETURNING` clause of an INSERT, and there's no anon SELECT policy (by
design, since that would let anyone read every customer's name, address,
email, and phone number).

`create_order()` is a `SECURITY DEFINER` function that performs the insert
as its owner (bypassing RLS, same intent as "allow anon insert") and
returns only `{id, order_no, status}` - never the row's PII. The `orders`
table itself has no anon-facing policy at all; `authenticated` (the admin)
has full access as specified.

## Status flow

```
pending_payment → payment_verification → payment_approved → packing → shipped → completed
exception: payment_rejected → (customer correction) → payment_verification
```

Every admin status change is expected to call the `send-order-email` Edge
Function (already wired from `src/components/admin/StatusControls.tsx`) so
the customer gets the matching email from CLAUDE.md §10.
