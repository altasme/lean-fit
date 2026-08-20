import { supabase, PAYMENT_PROOFS_BUCKET } from './supabase';
import { writeAuditLog } from './auditLog';
import type { Partner, PartnerStatus, PartnerType } from '../types/partner';
import type { AdminCreatePartnerInput } from './validation';

export async function listPartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Partner[];
}

export async function getPartner(id: string): Promise<Partner> {
  const { data, error } = await supabase.from('partners').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as Partner;
}

export async function getPartnerProofSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error || !data) throw new Error(error?.message ?? 'Could not create signed URL');
  return data.signedUrl;
}

/**
 * Grants (or resets) a partner's portal login by setting their password
 * directly via the `grant-portal-access` Edge Function - admin-only,
 * service-role. Creates the Supabase Auth user and links `partners.user_id`
 * the first time, or just updates the password if they already have a
 * login. Setting the password always happens; emailing the credentials to
 * the partner is a separate, optional step (`sendEmail`, default off - the
 * admin often just tells them in person).
 */
export async function grantPartnerPortalAccess(
  partnerId: string,
  password: string,
  sendEmail = false,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('grant-portal-access', {
    body: { mode: 'partner', partnerId, password, sendEmail },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error as string };
  return { error: null };
}

/**
 * Approves a pending partner application - verifies the package payment and
 * activates the partner in one step (see migration 0006's approve_partner()
 * for why this is a single combined action rather than the two independent
 * axes retail orders use). Generates the partner's referral code server-side
 * for atomic uniqueness. Portal access is a deliberately separate, manual
 * step (the "Portal Access" panel on the partner's detail page, once
 * active) - admin always types the password themselves, nothing is
 * auto-generated or auto-sent on approval.
 */
export async function approvePartner(partnerId: string): Promise<{ referralCode: string }> {
  const { data, error } = await supabase.rpc('approve_partner', { p_partner_id: partnerId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Partner was not approved.');

  await writeAuditLog({
    entity_type: 'partner',
    entity_id: partnerId,
    action: 'approved',
    note: `Referral code: ${row.referral_code}`,
  });

  return { referralCode: row.referral_code };
}

export type AdminCreatedPartner = { partnerId: string; status: PartnerStatus };

/**
 * Item #2's admin "Add Partner" form - full manual onboarding (type,
 * territory, package, payment) after a phone call, via migration 0014's
 * admin_create_partner(). When `existingLeadId` is set, completes that
 * pending lead in place instead of creating a duplicate row.
 */
export async function adminCreatePartner(input: AdminCreatePartnerInput): Promise<AdminCreatedPartner> {
  const { data, error } = await supabase.rpc('admin_create_partner', {
    p_full_name: input.fullName,
    p_email: input.email,
    p_mobile: input.mobile,
    p_address: input.address || null,
    p_partner_type: input.partnerType,
    p_territory_id: input.territoryId || null,
    p_barangay_name: input.barangayName,
    p_package: input.packageBoxes ? `${input.packageBoxes} Boxes` : null,
    p_package_boxes: input.packageBoxes,
    p_package_amount: input.packageAmount,
    p_payment_method: input.paymentMethod,
    p_payment_reference: input.paymentReference || null,
    p_payment_amount: input.paymentAmount,
    p_payment_date: input.paymentDate || null,
    p_payment_proof_path: null,
    p_activate: input.activate,
    p_existing_partner_id: input.existingLeadId,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Partner was not created.');

  await writeAuditLog({
    entity_type: 'partner',
    entity_id: row.partner_id,
    action: input.existingLeadId ? 'onboarded from lead' : 'created by admin',
    note: input.activate ? 'Activated immediately' : 'Saved as pending',
  });

  // Portal access is a separate, manual step (the "Portal Access" panel on
  // the partner's detail page) - admin always sets the password themselves,
  // even when activating immediately here.
  return { partnerId: row.partner_id, status: row.status };
}

export async function rejectPartner(partnerId: string): Promise<void> {
  const { error } = await supabase
    .from('partners')
    .update({ status: 'rejected', payment_status: 'rejected' })
    .eq('id', partnerId);
  if (error) throw new Error(error.message);

  await writeAuditLog({
    entity_type: 'partner',
    entity_id: partnerId,
    action: 'rejected',
  });
}

/**
 * Enforces spec §7/§9's strict level<->partner_type mapping and §58's
 * capacity check server-side (migration 0010's assign_partner_territory) -
 * not a plain client update, since admin's blanket table access would
 * otherwise let a client bug silently over-allocate a territory.
 */
export async function assignPartnerTerritory(partnerId: string, territoryId: string): Promise<void> {
  const { error } = await supabase.rpc('assign_partner_territory', {
    p_partner_id: partnerId,
    p_territory_id: territoryId,
  });
  if (error) throw new Error(error.message);

  await writeAuditLog({
    entity_type: 'partner',
    entity_id: partnerId,
    action: 'territory_assigned',
  });
}

/**
 * Suspending needs no RPC/invariant check - it always frees the partner's
 * territory slot (only 'active' partners count toward capacity), never
 * violates anything. Reactivating is the direction that can fail (someone
 * else may have taken the slot in the meantime), so that one goes through
 * migration 0010's reactivate_partner RPC instead.
 */
export async function suspendPartner(partnerId: string): Promise<void> {
  const { error } = await supabase.from('partners').update({ status: 'suspended' }).eq('id', partnerId);
  if (error) throw new Error(error.message);

  await writeAuditLog({ entity_type: 'partner', entity_id: partnerId, action: 'suspended' });
}

export async function reactivatePartner(partnerId: string): Promise<void> {
  const { error } = await supabase.rpc('reactivate_partner', { p_partner_id: partnerId });
  if (error) throw new Error(error.message);

  await writeAuditLog({ entity_type: 'partner', entity_id: partnerId, action: 'reactivated' });
}

export async function assignParentPartner(partnerId: string, parentPartnerId: string | null): Promise<void> {
  const { error } = await supabase
    .from('partners')
    .update({ parent_partner_id: parentPartnerId })
    .eq('id', partnerId);
  if (error) throw new Error(error.message);

  await writeAuditLog({ entity_type: 'partner', entity_id: partnerId, action: 'parent_assigned' });
}

/**
 * Which partner types are valid upstream parents for a given type. A
 * reseller's eligible list includes both distributor AND franchise -
 * admin manually picks whichever is actually appropriate (e.g. skips to
 * franchise when no distributor covers the area), which is spec §23's
 * "missing partner" rule applied by hand rather than auto-routed.
 * Franchise has no eligible parent - it's the top of the chain (§22).
 */
const ELIGIBLE_PARENT_TYPES: Record<PartnerType, PartnerType[]> = {
  reseller: ['distributor', 'franchise'],
  distributor: ['franchise'],
  franchise: [],
};

export async function fetchEligibleParentPartners(partnerType: PartnerType): Promise<Partner[]> {
  const types = ELIGIBLE_PARENT_TYPES[partnerType];
  if (types.length === 0) return [];

  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .in('partner_type', types)
    .eq('status', 'active');
  if (error) throw new Error(error.message);
  return (data ?? []) as Partner[];
}
