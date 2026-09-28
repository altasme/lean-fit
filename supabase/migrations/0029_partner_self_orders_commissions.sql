-- Lean & Fit - two client requests bundled into one migration since both
-- touch the partner/commission surface:
--
-- 1. "In the partner portal, clients should be able to order for
--    themselves inside the partner portal. And they get it at a price
--    that's already discounted according to how much their % off is."
--    partner_create_order() below is a NEW, partner-facing counterpart to
--    migration 0023's admin_create_manual_order() - same wholesale-order
--    shape (order_type/partner_id, never referral_partner_id/
--    partner_earnings - see 0023's header for why), but self-scoped via
--    my_partner_id() (migration 0009) instead of an admin-supplied
--    p_partner_id, manual-payment-only (no COD/Ganap - matches
--    PackagePaymentStep's "this is an investment payment, not a delivery
--    order" reasoning), and with NO p_mark_paid choice at all - a partner
--    must never be able to self-certify their own payment the way an
--    admin can. Price is computed SERVER-SIDE from the same formula as
--    calculatePartnerPrice()/create_order_with_payment()'s partner_price
--    (SRP x this partner's own tier discount) - never client-supplied -
--    so a tampered client call can't buy stock below the partner's real
--    tier price. Delivery address is pulled from the partner's own
--    profile (same convention as 0024's record_partner_onboarding_order),
--    not re-collected, since this order always ships to the partner.
--
-- 2. "Their commission is not counted until the order is marked as
--    complete." Pure application-layer fix - lib/partnerOrders.ts's
--    earningsStatusForOrder() changes from `payment.status = 'paid'` to
--    `order.status = 'completed'`. No schema change needed there since
--    commission was already derived at read time from orders.partner_earnings,
--    never a stored "accrued" flag.
--
-- 3. "In the admin panel, don't display package anymore. Instead display
--    how much commission is pending. There should also be a commission
--    management inside the partner's profile where the admin can record
--    if pending commission has been disbursed already and how much."
--    commission_disbursements below is a NEW manual ledger table an admin
--    writes to by hand when they've actually paid a partner their
--    commission - this is NOT the "automated payouts" CLAUDE.md §13 rules
--    out (that's about *automating* the act of paying somebody; this is
--    just recording, after the fact, that a human already did). Admin-only
--    RLS, same shape as audit_log (migration 0002) - no partner-facing
--    read policy, since the request is admin-side record-keeping only.
--
-- Paste after 0028.

-- ---------------------------------------------------------------------
-- partner_create_order()
-- ---------------------------------------------------------------------

create or replace function partner_create_order(
  p_quantity int,
  p_payment_method payment_method,
  p_payment_proof_path text,
  p_delivery_notes text default null,
  p_payment_reference text default null,
  p_payment_date date default null
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
  v_partner_id uuid;
  p partners%rowtype;
  v_order_type order_type;
  v_order_id uuid;
  v_order_no text;
  v_payment_id uuid;
  v_payment_no text;
  v_srp numeric;
  v_product_name text;
  v_discount_pct numeric;
  v_unit_price numeric;
  v_subtotal numeric;
begin
  v_partner_id := my_partner_id();
  if v_partner_id is null then
    raise exception 'Only a signed-in partner can place this order';
  end if;

  select * into p from partners where partners.id = v_partner_id;
  if p.status <> 'active' then
    raise exception 'Only active partners can order for themselves';
  end if;
  if p.partner_type is null or p.partner_type::text not in ('reseller', 'distributor', 'franchise') then
    raise exception 'Partner type not set';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;
  if p_payment_method not in ('gcash', 'maya', 'bank_transfer') then
    raise exception 'Select a manual payment method';
  end if;
  if p_payment_proof_path is null or length(trim(p_payment_proof_path)) = 0 then
    raise exception 'Proof of payment is required';
  end if;

  select products.srp, products.name into v_srp, v_product_name
  from products where status = 'active' order by created_at asc limit 1;
  if v_srp is null then
    raise exception 'No active product available to order';
  end if;

  select discount_pct into v_discount_pct
  from partner_pricing_tiers where partner_type = p.partner_type;

  v_unit_price := round(v_srp * (1 - coalesce(v_discount_pct, 0) / 100), 2);
  v_subtotal := round(v_unit_price * p_quantity, 2);
  v_order_type := p.partner_type::text::order_type;
  v_order_no := next_order_no_for_type(v_order_type);

  insert into orders (
    order_no, customer_name, email, mobile, address, barangay, city, province, postal_code,
    delivery_notes, product, quantity, unit_price, subtotal, delivery_fee, total,
    status, order_type, partner_id
  ) values (
    v_order_no, p.full_name, p.email, p.mobile,
    coalesce(p.address, ''), coalesce(p.barangay, ''), coalesce(p.city, ''), coalesce(p.region, ''), '',
    p_delivery_notes, v_product_name, p_quantity, v_unit_price, v_subtotal, 0, v_subtotal,
    'pending', v_order_type, v_partner_id
  )
  returning orders.id into v_order_id;

  insert into order_status_history (order_id, status, note)
  values (v_order_id, 'pending', 'Partner self-order placed via partner portal');

  insert into payments (
    order_id, method, provider, status, amount, reference, proof_path, payment_date
  ) values (
    v_order_id, p_payment_method, 'manual', 'pending_verification', v_subtotal,
    p_payment_reference, p_payment_proof_path, p_payment_date
  )
  returning payments.id into v_payment_id;

  insert into payment_status_history (payment_id, status, note)
  values (v_payment_id, 'pending_verification', 'Partner self-order placed via partner portal');

  select orders.order_no into v_order_no from orders where orders.id = v_order_id;
  select payments.payment_no into v_payment_no from payments where payments.id = v_payment_id;

  return query select v_order_id, v_order_no, 'pending'::order_status, v_payment_id, v_payment_no,
    'pending_verification'::payment_status;
end;
$$;

grant execute on function partner_create_order to authenticated;

-- ---------------------------------------------------------------------
-- commission_disbursements
-- ---------------------------------------------------------------------

create table commission_disbursements (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  disbursed_at date not null default current_date,
  note text,
  recorded_by uuid,
  created_at timestamptz not null default now()
);

create index commission_disbursements_partner_idx on commission_disbursements(partner_id);

alter table commission_disbursements enable row level security;

-- Admin-only, read and write - same shape as audit_log (migration 0002).
-- No partner-facing read policy: this is Lean & Fit's internal record of
-- who's actually been paid, not something surfaced in the partner portal.
create policy "admin full access on commission_disbursements"
  on commission_disbursements for all to authenticated using (is_admin()) with check (is_admin());
