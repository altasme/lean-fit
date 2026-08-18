import type { PaymentMethodId, PaymentStatus } from './payment';

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

/** Safe label lookup for a possibly-null type (a pending lead has none yet). */
export function partnerTypeLabel(type: PartnerType | null): string {
  return type ? PARTNER_TYPE_LABELS[type] : 'Unassigned';
}

// Migration 0011 added admin_users.role as inert groundwork; migration
// 0014 is the actual enforcement (is_full_admin() gates Products/
// Promotions/Partner Pricing writes). 'admin' = full access, 'staff_admin'
// = Orders only (view + act on status), everything else read/blocked.
export type AdminRole = 'admin' | 'staff_admin';

// --- Reseller Portal (Part 1) - individual partner accounts ---------

export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export type Partner = {
  id: string;
  user_id: string | null;
  // Migration 0014: nullable now - a lead from the public form (§7 below)
  // has no type yet, admin assigns one when they finish onboarding via
  // admin_create_partner(). Always set for an active/onboarded partner.
  partner_type: PartnerType | null;
  status: PartnerStatus;
  full_name: string;
  email: string;
  mobile: string;
  address: string | null;
  // Migration 0014: the lead form's free-text province (distinct from
  // region/city/barangay below, which only populate once a real
  // territory is actually assigned).
  province: string | null;
  // Applicant-provided location (plain text, spec §16) - distinct from
  // territory_id, the formal admin-assigned + capacity-checked territory
  // link set later at approval (spec §18-19).
  region: string | null;
  city: string | null;
  barangay: string | null;
  territory_id: string | null;
  parent_partner_id: string | null;
  // Part 2 §8 "Onboarded By" - who sponsored/paid for this partner via
  // partner-assisted onboarding (null for a direct public application).
  // Immutable historical record, distinct from parent_partner_id, which
  // admin can reassign later (Phase G) - the two usually start equal but
  // aren't kept in sync afterward.
  onboarded_by_partner_id: string | null;
  referral_code: string | null;
  package: string | null;
  // Package + payment (Phase C, spec §17-20) - attached to the same
  // partner row created at application time (Phase B), same manual-payment
  // shape as retail orders (method/reference/proof/amount/date).
  package_boxes: number | null;
  package_amount: number | null;
  payment_method: PaymentMethodId | null;
  payment_reference: string | null;
  payment_proof_path: string | null;
  payment_amount: number | null;
  payment_date: string | null;
  payment_status: PaymentStatus;
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

/**
 * Part 2 §2-5/§30 onboarding permission matrix - client-side mirror of
 * onboard_partner()'s server-side enforcement (migration 0011), used to
 * restrict the "Add Partner" form's type selector. The RPC is the source
 * of truth; this only avoids offering an option the server would reject.
 */
export const ONBOARDABLE_PARTNER_TYPES: Record<PartnerType, PartnerType[]> = {
  reseller: [],
  distributor: ['reseller'],
  franchise: ['reseller', 'distributor'],
};
