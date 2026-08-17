import { supabase, uploadPaymentProof } from './supabase';
import { calculatePartnerPrice } from './pricing';
import { notifyPartnerEvent } from './notify';
import type { OnboardPartnerInput, PartnerApplication } from './validation';
import type { Partner, PartnerPricingTier, PartnerStatus, PartnerType } from '../types/partner';
import { PARTNER_PACKAGE_BOXES } from '../types/partner';
import type { Product } from '../types/product';
import type { PaymentMethodId, PaymentStatus } from '../types/payment';
import type { TerritoryLevel } from '../types/territory';

/**
 * The signed-in partner's own record, via the "partner can read own
 * record" RLS policy (migration 0004: `user_id = auth.uid()`). Explicitly
 * filters by user_id rather than relying on RLS alone - an admin session
 * also passes that policy's OR'd "admin full access" branch, and without
 * the filter `.maybeSingle()` would throw once more than one partner row
 * exists. Returns null for a session with no linked partner row (not a
 * partner, or their invite hasn't finished linking user_id yet) rather
 * than throwing, since that's a normal state RequirePartnerAuth branches on.
 */
export async function fetchMyPartner(): Promise<Partner | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Partner | null) ?? null;
}

/**
 * Direct downstream partners (spec §46 - a Distributor's Resellers, a
 * Franchise's Distributors), via migration 0009's RLS. Populated either
 * by Phase G's admin reassignment or automatically by partner-assisted
 * onboarding (Part 2's onboard_partner() sets the sponsor as parent).
 */
export async function fetchDownstreamPartners(myPartnerId: string): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('parent_partner_id', myPartnerId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Partner[];
}

export async function fetchParentPartner(parentPartnerId: string): Promise<Partner | null> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('id', parentPartnerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Partner | null) ?? null;
}

/**
 * A partner's referral URL. Query-param based (`?ref=CODE`) rather than
 * the spec's cosmetic path-style example (`leanandfit.ph/maria`) - a
 * per-partner route would collide with the app's fixed routes and need
 * its own slug-routing layer; `?ref=` is the standard affiliate-link
 * pattern and is what Phase E's checkout attribution capture will read.
 */
export function buildReferralUrl(referralCode: string): string {
  return `${window.location.origin}/?ref=${referralCode}`;
}

export type SubmittedApplication = {
  partnerId: string;
  status: PartnerStatus;
};

/**
 * Migration 0012 rebuilt apply_for_partner() around a real picked
 * territory (territoryId = the city for Reseller/Distributor, the region
 * for Franchise; barangayName only for Reseller, resolved/lazily created
 * server-side) instead of free-text region/city/barangay - closes the
 * live-availability gap spec §19 always asked for on this form.
 */
export async function submitPartnerApplication(
  app: PartnerApplication,
): Promise<SubmittedApplication> {
  const { data, error } = await supabase.rpc('apply_for_partner', {
    p_full_name: app.fullName,
    p_email: app.email,
    p_mobile: app.mobile,
    p_address: app.address,
    p_partner_type: app.partnerType,
    p_territory_id: app.territoryId,
    p_barangay_name: app.barangayName,
  });

  if (error) throw new Error(`Failed to submit application: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Application was not submitted.');

  return { partnerId: row.partner_id, status: row.status };
}

export type PartnerPackage = {
  label: string;
  boxes: number;
  unitPrice: number;
  packageAmount: number;
};

/**
 * Package price for a partner type - boxes x per-box partner price, where
 * the per-box price comes from the SAME pricing engine (calculatePartnerPrice)
 * admin/website already use, never a separately hardcoded number (see
 * src/lib/pricing.ts). Picks the same single active product the storefront
 * shows (fetchActiveProduct's product-selection rule).
 */
export async function fetchPartnerPackage(partnerType: PartnerType): Promise<PartnerPackage | null> {
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1);
  if (productError) throw new Error(productError.message);

  const product = products?.[0] as Product | undefined;
  if (!product) return null;

  const { data: tiers, error: tierError } = await supabase.from('partner_pricing_tiers').select('*');
  if (tierError) throw new Error(tierError.message);

  const result = calculatePartnerPrice(product, partnerType, (tiers ?? []) as PartnerPricingTier[]);
  const boxes = PARTNER_PACKAGE_BOXES[partnerType];

  return {
    label: `${boxes} Boxes`,
    boxes,
    unitPrice: result.price,
    packageAmount: Math.round(result.price * boxes * 100) / 100,
  };
}

export type PartnerPackagePaymentInput = {
  partnerId: string;
  pkg: PartnerPackage;
  paymentMethod: PaymentMethodId;
  proofFile: File;
};

export type SubmittedPartnerPackagePayment = {
  partnerId: string;
  paymentStatus: PaymentStatus;
};

export async function submitPartnerPackagePayment(
  input: PartnerPackagePaymentInput,
): Promise<SubmittedPartnerPackagePayment> {
  const proofPath = await uploadPaymentProof(input.proofFile);

  const { data, error } = await supabase.rpc('submit_partner_package_payment', {
    p_partner_id: input.partnerId,
    p_package: input.pkg.label,
    p_package_boxes: input.pkg.boxes,
    p_package_amount: input.pkg.packageAmount,
    p_payment_method: input.paymentMethod,
    p_payment_reference: null,
    p_payment_amount: input.pkg.packageAmount,
    p_payment_date: null,
    p_payment_proof_path: proofPath,
  });

  if (error) throw new Error(`Failed to submit payment: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Payment was not submitted.');

  void notifyPartnerEvent(row.partner_id, 'package_payment_submitted');

  return { partnerId: row.partner_id, paymentStatus: row.payment_status };
}

export type TerritoryOption = {
  id: string;
  name: string;
  parentId: string | null;
  capacity: number | null;
  occupied: number;
};

/**
 * Capacity-aware territory options for the "Add Partner" form's picker -
 * migration 0011's list_territories_with_occupancy() RPC, since a
 * partner's own `partners` RLS visibility (migration 0009) doesn't extend
 * to computing occupancy across arbitrary other partners themselves.
 */
export async function fetchTerritoriesWithOccupancy(level: TerritoryLevel): Promise<TerritoryOption[]> {
  const { data, error } = await supabase.rpc('list_territories_with_occupancy', { p_level: level });
  if (error) throw new Error(error.message);

  return ((data ?? []) as { id: string; name: string; parent_id: string | null; capacity: number | null; occupied: number }[]).map(
    (t) => ({ id: t.id, name: t.name, parentId: t.parent_id, capacity: t.capacity, occupied: t.occupied }),
  );
}

export type OnboardedPartner = { partnerId: string; status: PartnerStatus };

/**
 * Part 2 §1 Route B - an authorized partner (Distributor/Franchise) adds
 * a new partner on someone else's behalf. All permission/territory/
 * capacity/containment enforcement happens server-side in
 * onboard_partner() (migration 0011) - this is a thin wrapper, same
 * pattern as submitPartnerApplication().
 */
export async function onboardPartner(input: OnboardPartnerInput): Promise<OnboardedPartner> {
  const { data, error } = await supabase.rpc('onboard_partner', {
    p_full_name: input.fullName,
    p_email: input.email,
    p_mobile: input.mobile,
    p_address: input.address,
    p_partner_type: input.partnerType,
    p_territory_id: input.territoryId,
    p_barangay_name: input.barangayName,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Partner was not onboarded.');

  return { partnerId: row.partner_id, status: row.status };
}
