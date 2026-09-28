-- Lean & Fit - client request: "update the payment method in the partner
-- portal" -> confirmed as "switch self-ordering to Ganap gateway", same
-- automated GCash/Maya/Online Banking gateway retail checkout already
-- uses (migration 0026/0027), replacing the manual GCash/Maya/Bank
-- Transfer + proof-upload flow migration 0029/0030 built. No admin
-- review, no screenshot upload - Ganap's webhook (existing
-- ganap-webhook Edge Function, already order_type-agnostic, no changes
-- needed there) settles the payment automatically, same as retail.
--
-- Different signature from 0029/0030's version (drops
-- p_payment_method/p_payment_proof_path/p_payment_reference/
-- p_payment_date - none of them apply to a gateway payment), so
-- `create or replace` would otherwise leave the old one as a second, dead
-- overload - drop it explicitly first, same reasoning as migration 0008
-- dropping the old create_order_with_payment signature.
--
-- MOQ enforcement (migration 0030) is unchanged, just carried over.
-- Paste after 0030.

drop function if exists partner_create_order(int, payment_method, text, text, text, date);

create or replace function partner_create_order(
  p_quantity int,
  p_delivery_notes text default null
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
    -- Ganap branch, matches create_order_with_payment's (migration 0027):
    -- order stays 'pending' until the webhook confirms payment.
    'pending', v_order_type, v_partner_id
  )
  returning orders.id into v_order_id;

  insert into order_status_history (order_id, status, note)
  values (v_order_id, 'pending', 'Partner self-order placed via partner portal (Ganap)');

  insert into payments (
    order_id, method, provider, status, amount
  ) values (
    v_order_id, 'ganap', 'ganap', 'pending', v_subtotal
  )
  returning payments.id into v_payment_id;

  insert into payment_status_history (payment_id, status, note)
  values (v_payment_id, 'pending', 'Partner self-order placed via partner portal (Ganap)');

  select orders.order_no into v_order_no from orders where orders.id = v_order_id;
  select payments.payment_no into v_payment_no from payments where payments.id = v_payment_id;

  return query select v_order_id, v_order_no, 'pending'::order_status, v_payment_id, v_payment_no,
    'pending'::payment_status;
end;
$$;

grant execute on function partner_create_order to authenticated;
