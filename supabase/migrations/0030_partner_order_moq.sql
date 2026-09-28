-- Lean & Fit - client request: "Implement MOQ in the self ordering in the
-- partner portal. Reseller MOQ 5, Distributor MOQ 15." A partner's own
-- restock order (migration 0029's partner_create_order()) must meet a
-- minimum quantity per their tier - same 5/15-box figures already used as
-- the tier-qualification minimums in the public Reseller page copy
-- (src/content/site.ts RESELLER.benefits). No franchise MOQ was given, so
-- franchise orders keep the existing "quantity must be positive" floor
-- (1) rather than guessing a number - update this migration's `case` (and
-- PARTNER_ORDER_MOQ in src/types/partner.ts) once the client specifies one.
--
-- Enforced SERVER-SIDE here (not just the client-side hint in
-- MyOrdersTab.tsx) so a partner can't bypass it by calling the RPC
-- directly - same reasoning as this function's server-computed unit price.
-- CREATE OR REPLACE reproduces 0029's partner_create_order() in full with
-- the one added check, matching this codebase's convention for evolving
-- an already-shipped RPC (e.g. 0021 reproducing 0011's admin_create_partner).
-- Paste after 0029.

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
  v_moq int;
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

  v_moq := case p.partner_type
    when 'reseller' then 5
    when 'distributor' then 15
    else 1
  end;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;
  if p_quantity < v_moq then
    raise exception 'Minimum order for % partners is % boxes', p.partner_type, v_moq;
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
