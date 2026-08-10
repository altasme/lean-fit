-- Lean & Fit - Supabase schema, RLS, and storage setup.
-- See CLAUDE.md §11 for the spec this implements: v2 Phase 2 payment
-- architecture (Order -> Payment -> Provider, two independent status axes).
-- One deliberate deviation is documented inline below (anon order/payment
-- creation goes through an RPC rather than direct table INSERT policies)
-- - see the note above `create_order_with_payment`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------

-- Fulfillment lifecycle (independent of payment).
create type order_status as enum (
  'pending', 'confirmed', 'packing', 'shipped', 'completed', 'cancelled'
);

-- Payment lifecycle (independent of order).
create type payment_status as enum (
  'pending', 'pending_verification', 'paid', 'failed', 'rejected', 'refunded', 'cancelled'
);

create type payment_method as enum (
  'gcash', 'maya', 'bank_transfer', 'cod' -- +paymongo future, not built (CLAUDE.md §13)
);

create type payment_provider as enum (
  'manual', 'cod' -- +paymongo future, not built (CLAUDE.md §13)
);

-- ---------------------------------------------------------------------
-- Order / payment numbering: LF-000123 / PAY-000123
-- ---------------------------------------------------------------------

create sequence if not exists order_no_seq start 1;
create sequence if not exists payment_no_seq start 1;

create or replace function next_order_no() returns text
language sql
as $$
  select 'LF-' || lpad(nextval('order_no_seq')::text, 6, '0');
$$;

create or replace function next_payment_no() returns text
language sql
as $$
  select 'PAY-' || lpad(nextval('payment_no_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null default next_order_no(),
  -- customer
  customer_name text not null,
  email text not null,
  mobile text not null,
  address text not null,
  barangay text not null,
  city text not null,
  province text not null,
  postal_code text not null,
  delivery_notes text,
  -- order lines
  product text not null default 'Lean & Fit Protein Coffee - Classic',
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  -- fulfillment (payment lives in its own table - see `payments`)
  status order_status not null default 'pending',
  courier text,
  tracking_number text,
  -- attribution hook (stubbed, nullable - reseller/affiliate-ready, zero cost now)
  ref_code text,
  reseller_id uuid, -- FK to resellers(id) in a future phase; null now
  -- meta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Payment is its own record. Order is NOT the payment. One order -> one
-- payment for MVP (Phase 2 doesn't need multi-attempt/split payments).
create table payments (
  id uuid primary key default gen_random_uuid(),
  payment_no text unique not null default next_payment_no(),
  order_id uuid not null references orders(id) on delete cascade,
  method payment_method not null,
  provider payment_provider not null default 'manual',
  status payment_status not null default 'pending',
  amount numeric(10,2) not null,
  currency text not null default 'PHP',
  -- manual fields (nullable - unused for COD/future gateway)
  reference text, -- customer-provided ref (manual) / provider txn ref (future)
  proof_path text, -- storage key in payment-proofs, manual only
  payment_date date,
  -- audit
  submitted_at timestamptz default now(),
  verified_at timestamptz,
  verified_by uuid, -- admin auth.users id
  -- gateway-ready (nullable now - DO NOT populate in Phase 2, see CLAUDE.md §13)
  provider_txn_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table payment_status_history (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  status payment_status not null,
  note text,
  changed_by uuid, -- admin auth.users id, null for system/customer-triggered rows
  created_at timestamptz not null default now()
);

create index order_status_history_order_id_idx on order_status_history(order_id);
create index payment_status_history_payment_id_idx on payment_status_history(payment_id);
create index payments_order_id_idx on payments(order_id);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
before update on orders
for each row execute function set_updated_at();

create trigger payments_set_updated_at
before update on payments
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table orders enable row level security;
alter table payments enable row level security;
alter table order_status_history enable row level security;
alter table payment_status_history enable row level security;

-- Admin (the single authenticated user for MVP) has full read/write on
-- everything - approve/reject/mark-paid/refund/cancel/advance-fulfillment
-- all go through direct authenticated table access from the admin app.
create policy "admin full access on orders"
  on orders for all to authenticated using (true) with check (true);

create policy "admin full access on payments"
  on payments for all to authenticated using (true) with check (true);

create policy "admin full access on order_status_history"
  on order_status_history for all to authenticated using (true) with check (true);

create policy "admin full access on payment_status_history"
  on payment_status_history for all to authenticated using (true) with check (true);

-- No anon SELECT/INSERT/UPDATE policy is defined on `orders` or `payments`
-- directly.
--
-- CLAUDE.md §11 specifies "orders, payments: anon INSERT (checkout) only".
-- In practice a direct anon INSERT policy still isn't enough: Postgres RLS
-- applies the SELECT policy to the RETURNING clause of an INSERT, so the
-- client would get back an empty row and never learn the new order's
-- order_no/id - and a broad anon SELECT policy to fix that would expose
-- every customer's name/address/email/phone (orders) or payment proof
-- path (payments) to anyone.
--
-- Instead, checkout goes through `create_order_with_payment()` below: a
-- SECURITY DEFINER function that performs both inserts as its owner
-- (bypassing RLS entirely, same intent as "allow anon insert") and
-- returns only the handful of fields the confirmation page needs - never
-- the rows' PII.

create or replace function create_order_with_payment(
  p_customer_name text,
  p_email text,
  p_mobile text,
  p_address text,
  p_barangay text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_delivery_notes text,
  p_product text,
  p_quantity int,
  p_unit_price numeric,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_payment_method payment_method,
  p_payment_reference text,
  p_payment_amount numeric,
  p_payment_date date,
  p_payment_proof_path text
) returns table (
  order_id uuid,
  order_no text,
  order_status order_status,
  payment_id uuid,
  payment_no text,
  payment_status payment_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_no text;
  v_order_status order_status;
  v_payment_id uuid;
  v_payment_no text;
  v_payment_status payment_status;
  v_provider payment_provider;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  -- Branch per CLAUDE.md §6: COD skips the verification gate entirely
  -- (order is confirmed on submit); manual e-wallet/bank methods wait on
  -- admin review.
  if p_payment_method = 'cod' then
    v_provider := 'cod';
    v_order_status := 'confirmed';
    v_payment_status := 'pending';
  else
    v_provider := 'manual';
    v_order_status := 'pending';
    v_payment_status := 'pending_verification';
  end if;

  insert into orders (
    customer_name, email, mobile, address, barangay, city, province, postal_code,
    delivery_notes, product, quantity, unit_price, subtotal, delivery_fee, total,
    status
  ) values (
    p_customer_name, p_email, p_mobile, p_address, p_barangay, p_city, p_province, p_postal_code,
    p_delivery_notes, p_product, p_quantity, p_unit_price, p_subtotal, p_delivery_fee, p_total,
    v_order_status
  )
  returning orders.id, orders.order_no into v_order_id, v_order_no;

  insert into order_status_history (order_id, status, note)
  values (v_order_id, v_order_status, 'Order submitted by customer');

  -- `amount` is the customer-reported/claimed payment amount (manual
  -- methods self-report this so mismatches vs `total` are visible to the
  -- admin reviewing proof) - defaults to the order total for COD, where
  -- nothing has been paid yet.
  insert into payments (
    order_id, method, provider, status, amount, reference, proof_path, payment_date
  ) values (
    v_order_id, p_payment_method, v_provider, v_payment_status,
    coalesce(p_payment_amount, p_total), p_payment_reference, p_payment_proof_path, p_payment_date
  )
  returning payments.id, payments.payment_no into v_payment_id, v_payment_no;

  insert into payment_status_history (payment_id, status, note)
  values (v_payment_id, v_payment_status, 'Payment submitted by customer');

  return query select v_order_id, v_order_no, v_order_status, v_payment_id, v_payment_no, v_payment_status;
end;
$$;

-- Anyone (including guest checkout) may call this - it's the only write
-- path into `orders`/`payments` available to unauthenticated users.
grant execute on function create_order_with_payment to anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage: private `payment-proofs` bucket
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Anon may upload (checkout proof-of-payment upload, manual methods only)
-- but never read/list/update/delete. Admin (authenticated) can read via
-- signed URL.
create policy "anon can upload payment proofs"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'payment-proofs');

create policy "admin can read payment proofs"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'payment-proofs');
