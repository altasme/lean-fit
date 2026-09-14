-- Lean & Fit - when a partner is successfully onboarded (moves to
-- 'active'), their onboarding package purchase is now also recorded as a
-- real row in Order Management (orders/payments), not just fields sitting
-- on the `partners` row. Client request: "When we successfully onboard a
-- partner, their orders too needs to get recorded in the order management
-- system." Paste after 0023 (reuses its order_type/partner_id/
-- next_order_no_for_type - same wholesale-order shape, since a partner's
-- onboarding package IS them buying their first batch of stock).
--
-- record_partner_onboarding_order() is the shared helper, called from the
-- three places a partner can transition to 'active': approve_partner()
-- (normal pending/onboarding -> active approval), admin_create_partner()
-- (admin onboarding a partner with p_activate = true), and
-- admin_override_partner_status() (the admin escape hatch, migration
-- 0022). All three are reproduced here in full via CREATE OR REPLACE
-- (matching the existing convention in this codebase - see how 0021
-- fully reproduced 0014's admin_create_partner rather than patching it)
-- with one added call each; nothing else about them changes.
--
-- Deliberately NOT the same thing as migration 0023's admin-keyed manual
-- restock order - this one is fully automatic (no admin form, no
-- p_mark_paid choice) and fires exactly once per partner, from whatever
-- package/payment fields are already on their `partners` row at the
-- moment they go active. Skips silently (returns null, does nothing) if
-- that partner has no package/payment data yet (e.g. an override to
-- 'active' with onboarding never actually completed) or already has an
-- order on file (idempotent - a later suspend/reactivate or repeat
-- override to 'active' never double-records the same package).

create or replace function record_partner_onboarding_order(p_partner_id uuid) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  p partners%rowtype;
  v_order_type order_type;
  v_order_id uuid;
  v_order_no text;
  v_payment_id uuid;
  v_unit_price numeric;
begin
  select * into p from partners where partners.id = p_partner_id;
  if p.id is null then
    return null;
  end if;

  if p.package_boxes is null or p.package_boxes <= 0
     or p.package_amount is null
     or p.payment_method is null
     or p.partner_type is null
     or p.partner_type::text not in ('reseller', 'distributor', 'franchise') then
    return null;
  end if;

  if exists (select 1 from orders where orders.partner_id = p_partner_id) then
    return null;
  end if;

  v_order_type := p.partner_type::text::order_type;
  v_order_no := next_order_no_for_type(v_order_type);
  v_unit_price := round(p.package_amount / p.package_boxes, 2);

  insert into orders (
    order_no, customer_name, email, mobile, address, barangay, city, province, postal_code,
    product, quantity, unit_price, subtotal, delivery_fee, total,
    status, order_type, partner_id
  ) values (
    v_order_no, p.full_name, p.email, p.mobile,
    coalesce(p.address, ''), coalesce(p.barangay, ''), coalesce(p.city, ''), coalesce(p.region, ''), '',
    coalesce(p.package, p.package_boxes::text || ' Boxes'), p.package_boxes, v_unit_price,
    p.package_amount, 0, p.package_amount,
    'confirmed', v_order_type, p_partner_id
  )
  returning orders.id into v_order_id;

  insert into order_status_history (order_id, status, note)
  values (v_order_id, 'confirmed', 'Recorded automatically - partner onboarding package');

  insert into payments (
    order_id, method, provider, status, amount, reference, proof_path, payment_date,
    verified_at, verified_by
  ) values (
    v_order_id, p.payment_method, 'manual', 'paid', p.package_amount, p.payment_reference,
    p.payment_proof_path, p.payment_date, now(), auth.uid()
  )
  returning payments.id into v_payment_id;

  insert into payment_status_history (payment_id, status, note, changed_by)
  values (v_payment_id, 'paid', 'Recorded automatically - partner onboarding package', auth.uid());

  return v_order_id;
end;
$$;

grant execute on function record_partner_onboarding_order to authenticated;

-- approve_partner() - unchanged from migration 0011's version except the
-- added record_partner_onboarding_order() call right before returning.
create or replace function approve_partner(p_partner_id uuid) returns table (
  partner_id uuid, referral_code text, status partner_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_referral_code text;
  v_territory_id uuid;
  v_capacity int;
  v_occupied int;
begin
  if not is_admin() then
    raise exception 'Only admins can approve partner applications';
  end if;

  select partners.full_name, partners.territory_id into v_full_name, v_territory_id
  from partners where partners.id = p_partner_id;
  if v_full_name is null then
    raise exception 'Partner not found';
  end if;

  if v_territory_id is not null then
    select territories.capacity into v_capacity from territories where territories.id = v_territory_id;
    if v_capacity is not null then
      select count(*) into v_occupied
      from partners
      where partners.territory_id = v_territory_id
        and partners.status = 'active'
        and partners.id <> p_partner_id;

      if v_occupied >= v_capacity then
        raise exception 'Cannot approve - the selected territory is now at capacity (% / %). Reassign a territory on this partner first.', v_occupied, v_capacity;
      end if;
    end if;
  end if;

  v_referral_code := generate_referral_code(v_full_name);

  update partners set status = 'active', activated_at = now(),
    referral_code = v_referral_code, payment_status = 'paid'
  where partners.id = p_partner_id;

  perform record_partner_onboarding_order(p_partner_id);

  return query select p_partner_id, v_referral_code, 'active'::partner_status;
end;
$$;

grant execute on function approve_partner to authenticated;

-- admin_create_partner() - unchanged from migration 0021's version except
-- the added record_partner_onboarding_order() call when p_activate makes
-- v_status = 'active'.
create or replace function admin_create_partner(
  p_full_name text,
  p_email text,
  p_mobile text,
  p_address text default null,
  p_partner_type partner_type default null,
  p_territory_id uuid default null,
  p_barangay_name text default null,
  p_package text default null,
  p_package_boxes int default null,
  p_package_amount numeric default null,
  p_payment_method payment_method default null,
  p_payment_reference text default null,
  p_payment_amount numeric default null,
  p_payment_date date default null,
  p_payment_proof_path text default null,
  p_activate boolean default false,
  p_existing_partner_id uuid default null
) returns table (partner_id uuid, status partner_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_final_territory_id uuid;
  v_region_name text;
  v_city_name text;
  v_barangay_name text;
  v_id uuid;
  v_referral_code text;
  v_status partner_status;
  v_payment_status payment_status;
  v_existing_status partner_status;
begin
  if not is_admin() then
    raise exception 'Only admins can manually add partners';
  end if;
  if p_activate and (p_partner_type is null or p_territory_id is null) then
    raise exception 'Partner type and territory are required to activate a partner';
  end if;

  if p_existing_partner_id is not null then
    select partners.status into v_existing_status from partners where partners.id = p_existing_partner_id;
    if v_existing_status is null then
      raise exception 'Partner not found';
    end if;
    if v_existing_status not in ('pending', 'onboarding') then
      raise exception 'This partner has already been onboarded';
    end if;
  end if;

  if p_territory_id is not null then
    if p_partner_type is null then
      raise exception 'Partner type is required when a territory is set';
    end if;
    v_final_territory_id := resolve_and_reserve_territory(p_partner_type, p_territory_id, p_barangay_name);
    select d.region_name, d.city_name, d.barangay_name into v_region_name, v_city_name, v_barangay_name
    from describe_territory_chain(v_final_territory_id) d;
  end if;

  v_status := case
    when p_activate then 'active'
    when p_existing_partner_id is not null then 'onboarding'
    else 'pending'
  end;
  v_payment_status := case when p_activate then 'paid' else 'pending_verification' end;
  if p_activate then
    v_referral_code := generate_referral_code(p_full_name);
  end if;

  if p_existing_partner_id is not null then
    update partners set
      full_name = p_full_name, email = p_email, mobile = p_mobile, address = p_address,
      region = v_region_name, city = v_city_name, barangay = v_barangay_name,
      partner_type = p_partner_type, territory_id = v_final_territory_id, status = v_status,
      package = p_package, package_boxes = p_package_boxes, package_amount = p_package_amount,
      payment_method = p_payment_method, payment_reference = p_payment_reference,
      payment_amount = p_payment_amount, payment_date = p_payment_date,
      payment_proof_path = p_payment_proof_path, payment_status = v_payment_status,
      referral_code = coalesce(v_referral_code, partners.referral_code),
      activated_at = case when p_activate then now() else partners.activated_at end
    where partners.id = p_existing_partner_id
    returning partners.id into v_id;
  else
    insert into partners (
      full_name, email, mobile, address, region, city, barangay,
      partner_type, territory_id, status,
      package, package_boxes, package_amount,
      payment_method, payment_reference, payment_amount, payment_date, payment_proof_path, payment_status,
      referral_code, activated_at
    ) values (
      p_full_name, p_email, p_mobile, p_address, v_region_name, v_city_name, v_barangay_name,
      p_partner_type, v_final_territory_id, v_status,
      p_package, p_package_boxes, p_package_amount,
      p_payment_method, p_payment_reference, p_payment_amount, p_payment_date, p_payment_proof_path, v_payment_status,
      v_referral_code, case when p_activate then now() else null end
    ) returning partners.id into v_id;
  end if;

  if v_status = 'active' then
    perform record_partner_onboarding_order(v_id);
  end if;

  return query select v_id, v_status;
end;
$$;

grant execute on function admin_create_partner to authenticated;

-- admin_override_partner_status() - unchanged from migration 0022's
-- version except the added record_partner_onboarding_order() call when
-- overriding a partner to 'active'.
create or replace function admin_override_partner_status(
  p_partner_id uuid,
  p_status partner_status
) returns table (partner_id uuid, status partner_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_existing_referral_code text;
  v_new_referral_code text;
begin
  if not is_admin() then
    raise exception 'Only admins can override a partner''s stage';
  end if;

  select partners.full_name, partners.referral_code
    into v_full_name, v_existing_referral_code
  from partners where partners.id = p_partner_id;

  if v_full_name is null then
    raise exception 'Partner not found';
  end if;

  if p_status = 'active' and v_existing_referral_code is null then
    v_new_referral_code := generate_referral_code(v_full_name);
  end if;

  update partners set
    status = p_status,
    referral_code = coalesce(v_new_referral_code, partners.referral_code),
    activated_at = case
      when p_status = 'active' and partners.activated_at is null then now()
      else partners.activated_at
    end
  where partners.id = p_partner_id;

  if p_status = 'active' then
    perform record_partner_onboarding_order(p_partner_id);
  end if;

  return query select p_partner_id, p_status;
end;
$$;

grant execute on function admin_override_partner_status to authenticated;
