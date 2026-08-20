-- Lean & Fit - Admin restructure follow-up: promotions split into Product
-- Promotion / Discount Code, plus Order Management's Return to Seller (RTS)
-- exception. Paste into the SQL editor after 0014.
--
-- Single paste, no enum-value two-step needed - `order_status`'s new value
-- is only ADDED here, never referenced in the same transaction (order rows
-- get set to 'returned' later, from ordinary client UPDATEs in production
-- traffic, a separate transaction), so it doesn't hit the "unsafe use of
-- new value" restriction that migration 0012 had to work around.

-- ---------------------------------------------------------------------
-- Order Management: Return to Seller (RTS)
-- ---------------------------------------------------------------------

-- A shipped order that never reached the customer (returned by the
-- courier) - reachable only from 'shipped', a dead end like 'cancelled'.
-- Deliberately excluded from revenue reporting regardless of the linked
-- payment's status (see OrderStats.tsx) - it never actually converted,
-- prepaid or not.
alter type order_status add value if not exists 'returned';

-- ---------------------------------------------------------------------
-- Promotions: split into two mutually exclusive types
-- ---------------------------------------------------------------------
-- 'product'  - auto-applies to exactly one product once the cart subtotal
--              (qty * SRP) reaches min_order_value. No code.
-- 'code'     - customer enters this code at checkout; discounts the order
--              subtotal once it reaches min_order_value. Never a specific
--              product.
-- The two never stack with each other (checkout logic, not a DB rule): a
-- valid code always replaces whatever product promotion would otherwise
-- have applied - see src/lib/pricing.ts.

create type promotion_type as enum ('product', 'code');

alter table promotions add column promotion_type promotion_type not null default 'code';
update promotions set promotion_type = (case when auto_apply then 'product' else 'code' end)::promotion_type;

alter table promotions add column min_order_value numeric(10,2) check (min_order_value is null or min_order_value >= 0);

alter table promotions add column product_id uuid references products(id) on delete cascade;

-- Backfill product_id for existing auto-apply rows: first product in the
-- old applicable_product_ids array if one was set, else the oldest active
-- product if the old row meant "applies to everything" (empty array) -
-- the new model requires exactly one product per product-promotion, so an
-- old "applies to all products" promo can only be approximated, not
-- reproduced exactly. Any row this can't resolve (no products exist at
-- all) is deactivated rather than left in a state that would violate the
-- shape check below - re-create it from the admin UI once a product exists.
update promotions
set product_id = coalesce(
  applicable_product_ids[1],
  (select id from products order by created_at asc limit 1)
)
where promotion_type = 'product';

update promotions set status = 'inactive' where promotion_type = 'product' and product_id is null;
update promotions set promotion_type = 'code' where promotion_type = 'product' and product_id is null;

-- Must happen before the next update - `code` is still NOT NULL until here.
alter table promotions alter column code drop not null;

-- Product promotions never carry a code; discount codes always require one.
update promotions set code = null where promotion_type = 'product';

alter table promotions drop column applicable_product_ids;
alter table promotions drop column auto_apply;

alter table promotions add constraint promotions_type_shape_check check (
  (promotion_type = 'product' and code is null and product_id is not null)
  or
  (promotion_type = 'code' and code is not null and product_id is null)
);

create index promotions_product_id_idx on promotions(product_id);

-- ---------------------------------------------------------------------
-- Orders: record which discount (if any) actually applied, so admin's
-- order detail page can show it rather than leaving unit_price/subtotal
-- looking unexplained when a discount code was used. unit_price/subtotal
-- keep meaning exactly what they always meant (the price actually
-- charged) - these two columns are purely for traceability/audit.
-- ---------------------------------------------------------------------

alter table orders add column discount_amount numeric(10,2) not null default 0;
alter table orders add column applied_promotion_id uuid references promotions(id);

-- Adding the two new params below changes the signature, so `create or
-- replace` would create a second overload instead of replacing this
-- function in place (Postgres only replaces on an exact signature match) -
-- drop the old 21-arg signature explicitly first.
drop function if exists create_order_with_payment(
  text, text, text, text, text, text, text, text, text, text, int, numeric,
  numeric, numeric, numeric, payment_method, text, numeric, date, text, text
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
