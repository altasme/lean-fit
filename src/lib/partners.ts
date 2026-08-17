import { supabase } from './supabase';
import type { PartnerApplication } from './validation';
import type { PartnerStatus } from '../types/partner';

export type SubmittedApplication = {
  partnerId: string;
  status: PartnerStatus;
};

export async function submitPartnerApplication(
  app: PartnerApplication,
): Promise<SubmittedApplication> {
  const { data, error } = await supabase.rpc('apply_for_partner', {
    p_full_name: app.fullName,
    p_email: app.email,
    p_mobile: app.mobile,
    p_address: app.address,
    p_region: app.region,
    p_city: app.city,
    p_barangay: app.barangay,
    p_partner_type: app.partnerType,
  });

  if (error) throw new Error(`Failed to submit application: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Application was not submitted.');

  return { partnerId: row.partner_id, status: row.status };
}
