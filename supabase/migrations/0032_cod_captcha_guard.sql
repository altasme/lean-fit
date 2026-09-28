-- Lean & Fit - client request: "add a captcha before a Cash on delivery
-- order gets submitted... to protect from spam orders." Cloudflare
-- Turnstile verification itself happens server-side in a new Edge
-- Function (supabase/functions/submit-cod-order) - a captcha token can
-- only be checked against Cloudflare's siteverify API over HTTP, which
-- Postgres has no clean way to call from inside this RPC.
--
-- What this migration adds is the other half: closing the bypass. Without
-- this guard, a spammer could just skip the client/captcha entirely and
-- call the public create_order_with_payment RPC directly with
-- p_payment_method = 'cod' - anon has always been able to call it (see
-- schema.sql's "Anyone (including guest checkout) may call this" grant),
-- and that's still exactly what checkout needs for manual/Ganap orders.
-- So the 'cod' branch specifically now requires the caller to be
-- service_role - which only the new Edge Function has, after it has
-- already verified the Turnstile token. Checkout.tsx's COD submission now
-- goes through that function (src/lib/orders.ts) instead of calling this
-- RPC directly; the manual/Ganap branches are completely unchanged, still
-- called directly by the browser as anon like today.
--
-- Signature is UNCHANGED from migration 0027's version - only the new
-- guard clause is added inside. Paste after 0027 (no interaction with
-- 0028-0031, which don't touch this function).

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
  p_payment_proof_path text,
  p_referral_code text default null,
  p_discount_amount numeric default 0,
  p_applied_promotion_id uuid default null
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
  v_referral_partner_id uuid;
  v_referral_partner_type partner_type;
  v_referral_parent_partner_id uuid;
  v_referral_territory_id uuid;
  v_srp numeric;
  v_discount_pct numeric;
  v_partner_price numeric;
  v_partner_earnings numeric;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  -- Client request: COD orders must be captcha-verified first. Only the
  -- submit-cod-order Edge Function (using the service role key, after a
  -- successful Turnstile check) may create one; a direct anon/authenticated
  -- call with p_payment_method = 'cod' is rejected outright.
  if p_payment_method = 'cod' and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Cash on Delivery orders must be submitted through the verified checkout endpoint';
  end if;

  if p_payment_method = 'cod' then
    v_provider := 'cod';
    v_order_status := 'confirmed';
    v_payment_status := 'pending';
  elsif p_payment_method = 'ganap' then
    v_provider := 'ganap';
    v_order_status := 'pending';
    v_payment_status := 'pending';
  else
    v_provider := 'manual';
    v_order_status := 'pending';
    v_payment_status := 'pending_verification';
  end if;

  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select id, partner_type, parent_partner_id, territory_id
      into v_referral_partner_id, v_referral_partner_type, v_referral_parent_partner_id, v_referral_territory_id
    from partners
    where upper(referral_code) = upper(trim(p_referral_code)) and status = 'active';

    if v_referral_partner_id is not null then
      select srp into v_srp from products where status = 'active' order by created_at asc limit 1;

      if v_srp is not null then
        select discount_pct into v_discount_pct
        from partner_pricing_tiers where partner_type = v_referral_partner_type;

        v_partner_price := round(v_srp * (1 - coalesce(v_discount_pct, 0) / 100), 2);
        v_partner_earnings := greatest(0, round((p_unit_price - v_partner_price) * p_quantity, 2));
      end if;
    end if;
  end if;

  insert into orders (
    customer_name, email, mobile, address, barangay, city, province, postal_code,
    delivery_notes, product, quantity, unit_price, subtotal, delivery_fee, total,
    status, ref_code, referral_partner_id, referral_partner_type,
    referral_parent_partner_id, referral_territory_id, partner_price, partner_earnings,
    discount_amount, applied_promotion_id
  ) values (
    p_customer_name, p_email, p_mobile, p_address, p_barangay, p_city, p_province, p_postal_code,
    p_delivery_notes, p_product, p_quantity, p_unit_price, p_subtotal, p_delivery_fee, p_total,
    v_order_status, p_referral_code, v_referral_partner_id, v_referral_partner_type,
    v_referral_parent_partner_id, v_referral_territory_id, v_partner_price, v_partner_earnings,
    coalesce(p_discount_amount, 0), p_applied_promotion_id
  )
  returning orders.id, orders.order_no into v_order_id, v_order_no;

  insert into order_status_history (order_id, status, note)
  values (v_order_id, v_order_status, 'Order submitted by customer');

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

grant execute on function create_order_with_payment to anon, authenticated;
