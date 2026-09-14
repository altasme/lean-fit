-- Lean & Fit - admin_create_partner() updates for the new 'onboarding'
-- stage. Split into its own file after 0020 rather than combined with
-- it: Postgres won't let a newly `ALTER TYPE ... ADD VALUE`'d enum
-- value be referenced within the SAME transaction that added it in
-- every Postgres version/client - keeping the two migrations separate
-- sidesteps that entirely regardless of how a given SQL editor batches
-- pasted statements. Paste after 0020, as its own run.
--
-- Only change: completing an existing lead's onboarding
-- (`p_existing_partner_id` set) now (a) accepts a lead that's already
-- been moved to 'onboarding' (not just 'pending' - the client's own
-- "Move to Onboarding" step, added client-side, sets that first), and
-- (b) when NOT activating immediately, leaves the partner in
-- 'onboarding' rather than reverting to 'pending' - otherwise a partner
-- whose form was completed without confirmed payment yet would
-- disappear from the visible "Onboarding" bucket back into "New" even
-- though onboarding clearly isn't a raw new lead anymore. A brand new
-- partner with NO existing lead (the plain "Add Partner, save for
-- later" case) is unaffected - it still defaults to 'pending'.
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

  return query select v_id, v_status;
end;
$$;

grant execute on function admin_create_partner to authenticated;
