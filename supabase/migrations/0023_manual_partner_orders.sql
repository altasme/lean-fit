-- Lean & Fit - admin can manually add wholesale/restock orders for an
-- active Reseller, Distributor, or Franchise partner (client request:
-- "Admins should be able to manually add orders" with a Reseller/
-- Distributor/Franchise Order dropdown and RO-/DO-/FO- numbering).
--
-- This is deliberately a DIFFERENT thing from a retail sale a partner
-- referred (which already exists - ref_code/referral_partner_id/
-- partner_earnings, migration 0008): it's the partner buying MORE stock
-- for themselves at their tier price, the same way `fetchPartnerPackage`
-- already prices their one-time onboarding package. So this order type
-- deliberately does NOT populate referral_partner_id/partner_earnings -
-- doing so would make a restock purchase count as a "referred sale"
-- toward that partner's own Total Online Sales / Top Sellers leaderboard
-- (migration 0018), which would be wrong. Instead it's linked via a new,
-- separate `partner_id` column, and its `email` is set to the partner's
-- own registered email so it naturally shows up in their portal's
-- "My Orders" (lib/partnerOrders.ts splitPartnerOrders already treats
-- "order email matches my own" as "my own purchase" - no new plumbing
-- needed there). Paste after 0022.

create type order_type as enum ('retail', 'reseller', 'distributor', 'franchise');

-- Every existing + every future checkout-created order gets 'retail' via
-- this default with zero code changes - checkout's INSERT (inside
-- create_order_with_payment) never sets order_type, so it just inherits it.
alter table orders add column order_type order_type not null default 'retail';
alter table orders add column partner_id uuid references partners(id);

-- One independent sequence per wholesale order type, so each starts its
-- own count at 000001 rather than sharing the retail LF- sequence.
create sequence if not exists reseller_order_no_seq start 1;
create sequence if not exists distributor_order_no_seq start 1;
create sequence if not exists franchise_order_no_seq start 1;

create or replace function next_order_no_for_type(p_order_type order_type) returns text
language sql
as $$
  select case p_order_type
    when 'reseller' then 'RO-' || lpad(nextval('reseller_order_no_seq')::text, 6, '0')
    when 'distributor' then 'DO-' || lpad(nextval('distributor_order_no_seq')::text, 6, '0')
    when 'franchise' then 'FO-' || lpad(nextval('franchise_order_no_seq')::text, 6, '0')
    else next_order_no() -- 'retail' - existing LF- sequence/function, untouched
  end;
$$;

-- admin_create_manual_order(): the admin-side "Add Order" form for a
-- wholesale/restock purchase by an existing ACTIVE partner. Mirrors
-- create_order_with_payment()'s shape (same manual-payment fields,
-- same order/payment record split) but requires p_order_type/p_partner_id
-- and rejects 'retail' outright - a manually-keyed retail sale isn't
-- this feature's job and has no wholesale partner to attribute to.
create or replace function admin_create_manual_order(
  p_order_type order_type,
  p_partner_id uuid,
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
  p_payment_proof_path text,
  p_mark_paid boolean default false
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
  v_partner_type partner_type;
  v_partner_status partner_status;
begin
  if not is_admin() then
    raise exception 'Only admins can manually add orders';
  end if;
  if p_order_type = 'retail' then
    raise exception 'Use the normal checkout/order flow for retail orders';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select partners.partner_type, partners.status into v_partner_type, v_partner_status
  from partners where partners.id = p_partner_id;

  if v_partner_type is null then
    raise exception 'Partner not found';
  end if;
  if v_partner_status <> 'active' then
    raise exception 'Selected partner is not active';
  end if;
  if v_partner_type <> p_order_type::text::partner_type then
    raise exception 'Selected partner is not a % partner', p_order_type;
  end if;

  v_order_no := next_order_no_for_type(p_order_type);
  v_order_status := case when p_mark_paid then 'confirmed' else 'pending' end;
  v_payment_status := case when p_mark_paid then 'paid' else 'pending_verification' end;

  insert into orders (
    order_no, customer_name, email, mobile, address, barangay, city, province, postal_code,
    delivery_notes, product, quantity, unit_price, subtotal, delivery_fee, total,
    status, order_type, partner_id
  ) values (
    v_order_no, p_customer_name, p_email, p_mobile, p_address, p_barangay, p_city, p_province, p_postal_code,
    p_delivery_notes, p_product, p_quantity, p_unit_price, p_subtotal, p_delivery_fee, p_total,
    v_order_status, p_order_type, p_partner_id
  )
  returning orders.id into v_order_id;

  insert into order_status_history (order_id, status, note)
  values (v_order_id, v_order_status, 'Order manually added by admin');

  insert into payments (
    order_id, method, provider, status, amount, reference, proof_path, payment_date,
    verified_at, verified_by
  ) values (
    v_order_id, p_payment_method, 'manual', v_payment_status,
    coalesce(p_payment_amount, p_total), p_payment_reference, p_payment_proof_path, p_payment_date,
    case when p_mark_paid then now() else null end,
    case when p_mark_paid then auth.uid() else null end
  )
  returning payments.id into v_payment_id;

  insert into payment_status_history (payment_id, status, note, changed_by)
  values (v_payment_id, v_payment_status, 'Order manually added by admin', case when p_mark_paid then auth.uid() else null end);

  select orders.order_no into v_order_no from orders where orders.id = v_order_id;
  select payments.payment_no into v_payment_no from payments where payments.id = v_payment_id;

  return query select v_order_id, v_order_no, v_order_status, v_payment_id, v_payment_no, v_payment_status;
end;
$$;

grant execute on function admin_create_manual_order to authenticated;
