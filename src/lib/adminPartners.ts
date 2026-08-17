import { supabase, PAYMENT_PROOFS_BUCKET } from './supabase';
import { writeAuditLog } from './auditLog';
import type { Partner } from '../types/partner';

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
 * Approves a pending partner application - verifies the package payment and
 * activates the partner in one step (see migration 0006's approve_partner()
 * for why this is a single combined action rather than the two independent
 * axes retail orders use). Generates the partner's referral code server-side
 * for atomic uniqueness.
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
