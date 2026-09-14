-- Lean & Fit - admin can force a partner to any stage directly.
-- Client request: "Admin must be able to override all stages" - the
-- guided per-stage actions (Move to Onboarding, Complete Onboarding,
-- Approve, Reject, Suspend, Reactivate) stay exactly as they are, but
-- an admin who needs to correct a mistake or handle an edge case
-- (e.g. a partner activated by accident, a rejection that should be
-- undone, restoring someone straight to Active without replaying the
-- whole pipeline) can jump directly to any status. Paste after 0021.
--
-- Deliberately bypasses every normal safeguard on the way there -
-- territory capacity (approve_partner/reactivate_partner both re-check
-- it), payment verification, the "already onboarded" guard on
-- admin_create_partner. That's the entire point of an override: it's an
-- escape hatch for admin to force a correction, not another guided
-- transition. The one thing it still does automatically is generate a
-- referral code when forcing a partner into 'active' who doesn't have
-- one yet - a referral-code-less active partner can't actually use the
-- portal, so leaving that half-done would just create a different bug.
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

  return query select p_partner_id, p_status;
end;
$$;

grant execute on function admin_override_partner_status to authenticated;
