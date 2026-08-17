-- Lean & Fit - Reseller Portal Part 1, Phase C: partner packages,
-- package payment, and admin approval. See spec Part 1 §17-20.
--
-- ADDITIVE ONLY. Paste after 0005.

-- ---------------------------------------------------------------------
-- partners: package + payment fields. Package price is computed at
-- submission time from the SAME pricing engine admin/website already use
-- (calculatePartnerPrice - SRP x partner tier discount x box count), not
-- a separately hardcoded number (spec §12 principle, applied here too).
-- payment_status reuses the existing payment_status enum - 'pending'
-- (default, before any payment is submitted) -> 'pending_verification'
-- (submitted, Phase C client) -> 'paid'/'rejected' (admin decision).
-- ---------------------------------------------------------------------

alter table partners add column package_boxes int;
alter table partners add column package_amount numeric(10,2);
alter table partners add column payment_method payment_method;
alter table partners add column payment_reference text;
alter table partners add column payment_proof_path text;
alter table partners add column payment_amount numeric(10,2);
alter table partners add column payment_date date;
alter table partners add column payment_status payment_status not null default 'pending';

-- ---------------------------------------------------------------------
-- submit_partner_package_payment - the write path for the package +
-- payment step (Phase B created the pending application; this call
-- attaches package/payment info to that same partner_id). Anon-callable
-- like apply_for_partner, but scoped so it can only touch a partner row
-- that hasn't been decided on yet - can't be used to tamper with an
-- already-approved/rejected application or someone else's payment fields
-- via a guessed id after the fact.
-- ---------------------------------------------------------------------

create or replace function submit_partner_package_payment(
  p_partner_id uuid,
  p_package text,
  p_package_boxes int,
  p_package_amount numeric,
  p_payment_method payment_method,
  p_payment_reference text,
  p_payment_amount numeric,
  p_payment_date date,
  p_payment_proof_path text
) returns table (
  partner_id uuid,
  payment_status payment_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status partner_status;
begin
  select status into v_status from partners where id = p_partner_id;

  if v_status is null then
    raise exception 'Partner application not found';
  end if;
  if v_status <> 'pending' then
    raise exception 'This application has already been decided and can no longer be updated';
  end if;

  update partners set
    package = p_package,
    package_boxes = p_package_boxes,
    package_amount = p_package_amount,
    payment_method = p_payment_method,
    payment_reference = p_payment_reference,
    payment_amount = p_payment_amount,
    payment_date = p_payment_date,
    payment_proof_path = p_payment_proof_path,
    payment_status = 'pending_verification'
  where id = p_partner_id;

  return query select p_partner_id, 'pending_verification'::payment_status;
end;
$$;

grant execute on function submit_partner_package_payment to anon, authenticated;

-- ---------------------------------------------------------------------
-- Referral code generation - spec §25 ("system-generated and guaranteed
-- to be unique"). Base = first word of the applicant's name, uppercased,
-- alphanumeric only; numeric suffix appended on collision.
-- ---------------------------------------------------------------------

create or replace function generate_referral_code(p_full_name text) returns text
language plpgsql
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix int := 0;
begin
  v_base := upper(regexp_replace(split_part(p_full_name, ' ', 1), '[^a-zA-Z0-9]', '', 'g'));
  if v_base = '' then
    v_base := 'PARTNER';
  end if;
  v_base := left(v_base, 12);

  v_candidate := v_base;
  while exists (select 1 from partners where referral_code = v_candidate) loop
    v_suffix := v_suffix + 1;
    v_candidate := v_base || v_suffix::text;
  end loop;

  return v_candidate;
end;
$$;

-- ---------------------------------------------------------------------
-- approve_partner - admin-only (checked via is_admin(), not RLS, since
-- this needs to atomically generate a unique referral code alongside the
-- status change). Combines payment verification and application approval
-- into one action for Phase C's MVP scope, matching how the spec presents
-- this as a single linear decision (Payment Verification -> Approved ->
-- Activated) rather than two independently toggleable axes the way retail
-- order/payment status are. Territory assignment + capacity checking is
-- deliberately NOT done here - no territories exist yet and there's no
-- admin UI to create them (Phase G); territory_id stays null until then.
-- ---------------------------------------------------------------------

create or replace function approve_partner(p_partner_id uuid) returns table (
  partner_id uuid,
  referral_code text,
  status partner_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_referral_code text;
begin
  if not is_admin() then
    raise exception 'Only admins can approve partner applications';
  end if;

  select full_name into v_full_name from partners where id = p_partner_id;
  if v_full_name is null then
    raise exception 'Partner not found';
  end if;

  v_referral_code := generate_referral_code(v_full_name);

  update partners set
    status = 'active',
    activated_at = now(),
    referral_code = v_referral_code,
    payment_status = 'paid'
  where id = p_partner_id;

  return query select p_partner_id, v_referral_code, 'active'::partner_status;
end;
$$;

grant execute on function approve_partner to authenticated;
