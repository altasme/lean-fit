-- Lean & Fit - Reseller Portal Part 1, Phase E: order routing, partner
-- pricing, earnings. See "Lean & Fit Phase 2 - Partner Distribution,
-- Reseller Portal & Territorial Sales System" spec Part 1 §26-36, §54-55.
--
-- ADDITIVE ONLY except for replacing create_order_with_payment() (adds one
-- new optional trailing param, p_referral_code - existing callers that
-- omit it keep working exactly as before). Paste after 0002-0007.

-- ---------------------------------------------------------------------
-- Bug fix, found while building this phase: partner_pricing_tiers has had
-- NO anon-read policy since it was created (migration 0002 deliberately
-- made it admin-only - "partner pricing is not retail-facing" was true
-- at the time, before /reseller existed). But Phase C's public package-
-- payment step (src/lib/partners.ts fetchPartnerPackage) already reads
-- this table as anon to compute the applicant's package price - under RLS
-- that select silently returns zero rows, calculatePartnerPrice() falls
-- back to a 0% discount, and every applicant has been quoted/charged full
-- SRP instead of their tier price since Phase C shipped. This phase also
-- needs anon read access here (to price the referring partner's earnings
-- at order time), so fixing it here rather than filing it as separate
-- follow-up. Tier discount percentages aren't sensitive - same reasoning
-- as the public product/promotion read policies in migration 0002.
-- ---------------------------------------------------------------------

create policy "anyone can read partner pricing tiers"
  on partner_pricing_tiers for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------
-- create_order_with_payment(): adds referral attribution + earnings.
--
-- Referral resolution and the partner_price/partner_earnings calculation
-- both happen SERVER-SIDE here, not client-supplied like unit_price/total
-- are - those numbers feed a partner's future payout (spec §26/§44), so
-- they need one authoritative source that a tampered client request can't
-- override, unlike the customer's own retail total (lower stakes, already
-- reviewed manually during payment verification).
--
-- Only attributes to an ACTIVE partner with a matching referral_code -
-- unknown/expired/inactive codes are silently ignored (order still
-- succeeds, unattributed) rather than failing checkout.
--
-- Earnings = (price the customer actually paid - the referring partner's
-- own tier price) x quantity, per spec §26-27/§34's worked examples,
-- clamped at 0 so a promo/discount that undercuts the partner's tier
-- price can't produce a negative "earning." Tier price is computed
-- against the product's SRP (spec §6: "Reseller Price = 20% below SRP"),
-- not against whatever promo price the customer happened to pay.
-- ---------------------------------------------------------------------

-- The new p_referral_code param makes this a different signature from the
-- one in schema.sql, so `create or replace` would otherwise leave that
-- original as a second, dead overload rather than actually replacing it
-- (same reason migration 0005 dropped apply_for_partner's old signature
-- before recreating it). Drop it explicitly first.
drop function if exists create_order_with_payment(
  text, text, text, text, text, text, text, text, text, text,
  int, numeric, numeric, numeric, numeric,
  payment_method, text, numeric, date, text
);

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
  p_referral_code text default null
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

  if p_payment_method = 'cod' then
    v_provider := 'cod';
    v_order_status := 'confirmed';
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
    referral_parent_partner_id, referral_territory_id, partner_price, partner_earnings
  ) values (
    p_customer_name, p_email, p_mobile, p_address, p_barangay, p_city, p_province, p_postal_code,
    p_delivery_notes, p_product, p_quantity, p_unit_price, p_subtotal, p_delivery_fee, p_total,
    v_order_status, p_referral_code, v_referral_partner_id, v_referral_partner_type,
    v_referral_parent_partner_id, v_referral_territory_id, v_partner_price, v_partner_earnings
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
