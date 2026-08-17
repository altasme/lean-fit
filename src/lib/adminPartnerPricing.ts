import { supabase } from './supabase';
import type { PartnerPricingTier, PartnerType } from '../types/partner';

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
  const { data, error } = await supabase
    .from('partner_pricing_tiers')
    .update({ discount_pct: discountPct })
    .eq('partner_type', partnerType)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PartnerPricingTier;
}
