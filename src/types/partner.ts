export type PartnerType = 'reseller' | 'distributor' | 'franchise';

export type PartnerPricingTier = {
  partner_type: PartnerType;
  discount_pct: number;
  updated_at: string;
  updated_by: string | null;
};

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  reseller: 'Reseller',
  distributor: 'Distributor',
  franchise: 'Franchise',
};
