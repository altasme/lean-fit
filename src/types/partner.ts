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

// --- Reseller Portal (Part 1) - individual partner accounts ---------

export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export type Partner = {
  id: string;
  user_id: string | null;
  partner_type: PartnerType;
  status: PartnerStatus;
  full_name: string;
  email: string;
  mobile: string;
  address: string | null;
  // Applicant-provided location (plain text, spec §16) - distinct from
  // territory_id, the formal admin-assigned + capacity-checked territory
  // link set later at approval (spec §18-19).
  region: string | null;
  city: string | null;
  barangay: string | null;
  territory_id: string | null;
  parent_partner_id: string | null;
  referral_code: string | null;
  package: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
};

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  suspended: 'Suspended',
  rejected: 'Rejected',
};

/** Package boxes per partner type - spec Part 1 §17 (10/30/40 boxes, 10 sachets/box). */
export const PARTNER_PACKAGE_BOXES: Record<PartnerType, number> = {
  reseller: 10,
  distributor: 30,
  franchise: 40,
};
