-- Lean & Fit - Supabase schema, RLS, and storage setup.
-- See CLAUDE.md §11 for the spec this implements. One deliberate deviation
-- is documented inline below (anon order creation goes through an RPC
-- rather than a direct table INSERT policy) - see the note above
-- `create_order`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------

create type order_status as enum (
  'pending_payment','payment_verification','payment_approved',
  'packing','shipped','completed','payment_rejected'
);

-- ---------------------------------------------------------------------
-- Order numbering: LF-000123
-- ---------------------------------------------------------------------

create sequence if not exists order_no_seq start 1;

create or replace function next_order_no() returns text
language sql
as $$
  select 'LF-' || lpad(nextval('order_no_seq')::text, 6, '0');
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
  -- order
  product text not null default 'Lean & Fit Protein Coffee - Classic',
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  -- payment
  payment_method text not null,
  payment_reference text,
  payment_amount numeric(10,2),
  payment_date date,
  payment_proof_path text,                    -- storage key in payment-proofs
  -- fulfillment
  status order_status not null default 'payment_verification',
  courier text,
  tracking_number text,
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

create index order_status_history_order_id_idx on order_status_history(order_id);

-- ---------------------------------------------------------------------
-- updated_at trigger
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

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table orders enable row level security;
alter table order_status_history enable row level security;

-- Admin (the single authenticated user for MVP) has full read/write.
create policy "admin full access on orders"
  on orders for all
  to authenticated
  using (true)
  with check (true);

create policy "admin full access on order_status_history"
  on order_status_history for all
  to authenticated
  using (true)
  with check (true);

-- No anon SELECT/INSERT/UPDATE policy is defined on `orders` directly.
--
-- CLAUDE.md §11 specifies "orders: allow anon INSERT (checkout)". In
-- practice a direct anon INSERT policy still isn't enough: Postgres RLS
-- applies the SELECT policy to the RETURNING clause of an INSERT, so the
-- client would get back an empty row and never learn the new order's
-- order_no/id - and a broad anon SELECT policy to fix that would expose
-- every customer's name/address/email/phone to anyone.
--
-- Instead, checkout goes through `create_order()` below: a SECURITY
-- DEFINER function that performs the insert as its owner (bypassing RLS
-- entirely, same intent as "allow anon insert") and returns only
-- {id, order_no, status} - never the row's PII - to the caller.

create or replace function create_order(
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
  p_payment_method text,
  p_payment_reference text,
  p_payment_amount numeric,
  p_payment_date date,
  p_payment_proof_path text
) returns table (id uuid, order_no text, status order_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_order_no text;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  insert into orders (
    customer_name, email, mobile, address, barangay, city, province, postal_code,
    delivery_notes, product, quantity, unit_price, subtotal, delivery_fee, total,
    payment_method, payment_reference, payment_amount, payment_date, payment_proof_path
  ) values (
    p_customer_name, p_email, p_mobile, p_address, p_barangay, p_city, p_province, p_postal_code,
    p_delivery_notes, p_product, p_quantity, p_unit_price, p_subtotal, p_delivery_fee, p_total,
    p_payment_method, p_payment_reference, p_payment_amount, p_payment_date, p_payment_proof_path
  )
  returning orders.id, orders.order_no into v_id, v_order_no;

  insert into order_status_history (order_id, status, note)
  values (v_id, 'payment_verification', 'Order submitted by customer');

  return query select v_id, v_order_no, 'payment_verification'::order_status;
end;
$$;

-- Anyone (including guest checkout) may call this - it's the only write
-- path into `orders` available to unauthenticated users.
grant execute on function create_order to anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage: private `payment-proofs` bucket
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Anon may upload (checkout proof-of-payment upload) but never read/list/
-- update/delete. Admin (authenticated) can read via signed URL.
create policy "anon can upload payment proofs"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'payment-proofs');

create policy "admin can read payment proofs"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'payment-proofs');
