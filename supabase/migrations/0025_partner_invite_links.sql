-- Lean & Fit - partner-to-partner invite links (client request):
--
-- "Admins must be able to assign who the upline/downline/parent partner
-- is" - already fully built and unused (assignParentPartner/
-- fetchEligibleParentPartners in lib/adminPartners.ts, parent_partner_id
-- on `partners` since migration 0004) - only the admin UI to use it was
-- missing (added client-side, no DB change needed for that half).
--
-- "There should also be a partner invite system... Distributors can
-- invite resellers and they have their own invite link. When the
-- reseller signs up with that link, their partner record will state who
-- the upline is... Franchise are the upline of Distributors and can
-- invite both Distributors and resellers... Resellers cannot have a
-- downline nor invite other resellers... The link must show in the
-- partner portal but is not the same as the unique partner link."
--
-- This is a NEW, separate mechanism from the customer-facing referral
-- link (`referral_code`/`buildReferralUrl`, path-based per migration
-- 0018) - that one attributes RETAIL SALES for commission/Top Sellers.
-- This one attributes PARTNER RECRUITMENT (who onboarded whom in the
-- reseller/distributor/franchise hierarchy) and shares nothing with it -
-- hence a distinct `invite_code` column and a distinct `/join/CODE`
-- public route, never `/CODE`.
--
-- Deliberately NOT a resurrection of migration 0011/0017's onboard_partner()
-- (the sponsor filling out the new partner's form on their behalf, later
-- disabled by client decision). That flow no longer even fits the current
-- architecture - migration 0014 collapsed the public application down to
-- a bare lead-capture form (submit_partner_lead: name/email/mobile/
-- province/city, no type, no territory) with admin completing onboarding
-- by phone afterward. This invite system fits INSIDE that same shape: the
-- invitee still submits their own lead the normal way (still 'pending',
-- still admin-completed later), the only difference is the invite code
-- pre-attributes parent_partner_id/onboarded_by_partner_id (and, since
-- the invite already implies it, partner_type) at submission time -
-- "their partner record will state who the upline is" from the moment
-- they sign up, not only after admin gets around to it.

alter table partners add column invite_code text unique;

-- Same shape as generate_referral_code() (migration 0018's version) but
-- a completely separate namespace/uniqueness check - an invite code and a
-- referral code must never collide with EACH OTHER either, since both
-- ultimately key off `partners` and a mixup would misattribute a retail
-- sale as a partner recruitment or vice versa. No reserved-word list
-- needed (unlike the referral generator) since invite codes only ever
-- appear under /join/, never as a bare top-level path.
create or replace function generate_invite_code(p_full_name text) returns text
language plpgsql
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix int := 0;
begin
  v_base := lower(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g'));
  if v_base = '' then
    v_base := 'partner';
  end if;
  v_base := left(v_base, 20);

  v_candidate := v_base;
  while exists (select 1 from partners where invite_code = v_candidate)
     or exists (select 1 from partners where referral_code = v_candidate) loop
    v_suffix := v_suffix + 1;
    v_candidate := v_base || v_suffix::text;
  end loop;

  return v_candidate;
end;
$$;

-- Backfill: every already-active Distributor/Franchise gets an invite
-- code immediately, without waiting for their next status transition.
-- Resellers never get one - they have no downline to invite (client
-- rule: "Resellers cannot have a downline nor invite other resellers").
update partners
set invite_code = generate_invite_code(full_name)
where partner_type in ('distributor', 'franchise')
  and status = 'active'
  and invite_code is null;

-- get_invite_info(): public, read-only lookup so the /join/:code landing
-- page can say "You've been invited by X to join as a Y" before the
-- visitor has submitted anything. Deliberately returns ONLY full_name +
-- partner_type - no email/mobile/address/payment/territory, none of
-- which a stranger following a shared link has any business seeing.
create or replace function get_invite_info(p_invite_code text) returns table (
  inviter_name text, inviter_type partner_type
)
language sql
stable
security definer
set search_path = public
as $$
  select full_name, partner_type from partners
  where invite_code = p_invite_code and status = 'active';
$$;

grant execute on function get_invite_info to anon, authenticated;

-- submit_partner_lead(): unchanged from migration 0014's version except
-- the two new trailing optional params. A different parameter LIST counts
-- as a different function to Postgres even with defaults, so plain
-- CREATE OR REPLACE would add a second overload instead of replacing the
-- 5-arg original - drop it explicitly first (same pattern 0014 itself
-- used when it replaced apply_for_partner). When p_invite_code is given, the
-- inviting partner must be active and be a Distributor or Franchise
-- (Resellers have no invite_code to look up in the first place, so this
-- also naturally rejects a forged/reused code that happens to belong to
-- a Reseller). A Distributor's invite always produces a Reseller lead -
-- p_partner_type is ignored/overridden for them, since there's only one
-- possible answer and trusting client input here would let a visitor
-- claim "Distributor" through a Distributor's own invite link. A
-- Franchise's invite can produce either a Reseller or a Distributor
-- lead, so p_partner_type IS required and validated against that pair.
drop function if exists submit_partner_lead(text, text, text, text, text);

create or replace function submit_partner_lead(
  p_full_name text,
  p_email text,
  p_mobile text,
  p_province text,
  p_city text,
  p_invite_code text default null,
  p_partner_type partner_type default null
) returns table (partner_id uuid, status partner_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
  v_inviter_id uuid;
  v_inviter_type partner_type;
  v_resolved_type partner_type;
begin
  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'Full name is required';
  end if;
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'Email is required';
  end if;
  if p_mobile is null or length(trim(p_mobile)) = 0 then
    raise exception 'Mobile number is required';
  end if;

  if p_invite_code is not null then
    select partners.id, partners.partner_type into v_inviter_id, v_inviter_type
    from partners where partners.invite_code = p_invite_code and partners.status = 'active';

    if v_inviter_id is null then
      raise exception 'This invite link is no longer valid';
    end if;

    if v_inviter_type = 'distributor' then
      v_resolved_type := 'reseller';
    elsif v_inviter_type = 'franchise' then
      if p_partner_type is null or p_partner_type not in ('reseller', 'distributor') then
        raise exception 'Select whether you are joining as a Reseller or a Distributor';
      end if;
      v_resolved_type := p_partner_type;
    else
      raise exception 'This partner cannot invite new partners';
    end if;
  end if;

  insert into partners (
    full_name, email, mobile, province, city, status,
    partner_type, parent_partner_id, onboarded_by_partner_id
  )
  values (
    p_full_name, p_email, p_mobile, p_province, p_city, 'pending',
    v_resolved_type, v_inviter_id, v_inviter_id
  )
  returning partners.id into v_new_id;

  return query select v_new_id, 'pending'::partner_status;
end;
$$;

grant execute on function submit_partner_lead to anon, authenticated;

-- The three activation points get an invite_code generated alongside
-- their existing referral_code, gated to Distributor/Franchise only -
-- same reasoning as the backfill above. All three otherwise unchanged
-- from migration 0024's versions.

create or replace function approve_partner(p_partner_id uuid) returns table (
  partner_id uuid, referral_code text, status partner_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_partner_type partner_type;
  v_referral_code text;
  v_invite_code text;
  v_territory_id uuid;
  v_capacity int;
  v_occupied int;
begin
  if not is_admin() then
    raise exception 'Only admins can approve partner applications';
  end if;

  select partners.full_name, partners.partner_type, partners.territory_id
    into v_full_name, v_partner_type, v_territory_id
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
  if v_partner_type in ('distributor', 'franchise') then
    v_invite_code := generate_invite_code(v_full_name);
  end if;

  update partners set status = 'active', activated_at = now(),
    referral_code = v_referral_code,
    invite_code = coalesce(v_invite_code, partners.invite_code),
    payment_status = 'paid'
  where partners.id = p_partner_id;

  perform record_partner_onboarding_order(p_partner_id);

  return query select p_partner_id, v_referral_code, 'active'::partner_status;
end;
$$;

grant execute on function approve_partner to authenticated;

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
  v_invite_code text;
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
    if p_partner_type in ('distributor', 'franchise') then
      v_invite_code := generate_invite_code(p_full_name);
    end if;
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
      invite_code = coalesce(v_invite_code, partners.invite_code),
      activated_at = case when p_activate then now() else partners.activated_at end
    where partners.id = p_existing_partner_id
    returning partners.id into v_id;
  else
    insert into partners (
      full_name, email, mobile, address, region, city, barangay,
      partner_type, territory_id, status,
      package, package_boxes, package_amount,
      payment_method, payment_reference, payment_amount, payment_date, payment_proof_path, payment_status,
      referral_code, invite_code, activated_at
    ) values (
      p_full_name, p_email, p_mobile, p_address, v_region_name, v_city_name, v_barangay_name,
      p_partner_type, v_final_territory_id, v_status,
      p_package, p_package_boxes, p_package_amount,
      p_payment_method, p_payment_reference, p_payment_amount, p_payment_date, p_payment_proof_path, v_payment_status,
      v_referral_code, v_invite_code, case when p_activate then now() else null end
    ) returning partners.id into v_id;
  end if;

  if v_status = 'active' then
    perform record_partner_onboarding_order(v_id);
  end if;

  return query select v_id, v_status;
end;
$$;

grant execute on function admin_create_partner to authenticated;

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
  v_partner_type partner_type;
  v_existing_referral_code text;
  v_existing_invite_code text;
  v_new_referral_code text;
  v_new_invite_code text;
begin
  if not is_admin() then
    raise exception 'Only admins can override a partner''s stage';
  end if;

  select partners.full_name, partners.partner_type, partners.referral_code, partners.invite_code
    into v_full_name, v_partner_type, v_existing_referral_code, v_existing_invite_code
  from partners where partners.id = p_partner_id;

  if v_full_name is null then
    raise exception 'Partner not found';
  end if;

  if p_status = 'active' then
    if v_existing_referral_code is null then
      v_new_referral_code := generate_referral_code(v_full_name);
    end if;
    if v_existing_invite_code is null and v_partner_type in ('distributor', 'franchise') then
      v_new_invite_code := generate_invite_code(v_full_name);
    end if;
  end if;

  update partners set
    status = p_status,
    referral_code = coalesce(v_new_referral_code, partners.referral_code),
    invite_code = coalesce(v_new_invite_code, partners.invite_code),
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
