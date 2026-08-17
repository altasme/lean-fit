import { supabase } from './supabase';
import type { PartnerPricingTier, PartnerType } from '../types/partner';
import { PARTNER_TYPE_LABELS } from '../types/partner';
import { writeAuditLog } from './auditLog';

export async function listPartnerPricingTiers(): Promise<PartnerPricingTier[]> {
  const { data, error } = await supabase
    .from('partner_pricing_tiers')
    .select('*')
    .order('partner_type', { ascending: true });
  if (error) throw new Error(error.message);
  return data as PartnerPricingTier[];
}

export async function updatePartnerDiscount(
  partnerType: PartnerType,
  discountPct: number,
): Promise<PartnerPricingTier> {
  const { data: before, error: beforeError } = await supabase
    .from('partner_pricing_tiers')
    .select('*')
    .eq('partner_type', partnerType)
    .single();
  if (beforeError) throw new Error(beforeError.message);

  const { data, error } = await supabase
    .from('partner_pricing_tiers')
    .update({ discount_pct: discountPct })
    .eq('partner_type', partnerType)
    .select()
    .single();
  if (error) throw new Error(error.message);

  const previousPct = (before as PartnerPricingTier).discount_pct;
  if (previousPct !== discountPct) {
    await writeAuditLog({
      entity_type: 'partner_pricing',
      entity_id: partnerType,
      action: 'partner_pricing_changed',
      field: PARTNER_TYPE_LABELS[partnerType],
      previous_value: `${previousPct}%`,
      new_value: `${discountPct}%`,
    });
  }

  return data as PartnerPricingTier;
}
