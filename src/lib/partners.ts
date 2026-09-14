import { supabase, uploadPaymentProof } from './supabase';
import { calculatePartnerPrice } from './pricing';
import { notifyPartnerEvent } from './notify';
import { stripPortalPrefix } from './hostRouting';
import type { OnboardPartnerInput, PartnerLead } from './validation';
import type { Partner, PartnerPricingTier, PartnerStatus, PartnerType } from '../types/partner';
import { PARTNER_PACKAGE_BOXES } from '../types/partner';
import type { Product } from '../types/product';
import type { PaymentMethodId, PaymentStatus } from '../types/payment';

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
 * A partner's referral URL: leanandfit.ph/{referral_code} - resolved by
 * the /:slug catch-all route (App.tsx / pages/ReferralRedirect.tsx),
 * which ranks below every fixed route so it can never collide with them.
 *
 * This is called from inside the partner portal, which itself lives on
 * its own subdomain (partner.leanandfit.ph) - using window.location.origin
 * directly here would build a link back to the PORTAL, not the
 * customer-facing site the link is actually meant to send buyers to. Set
 * VITE_SITE_URL to the customer-facing origin to make this exact
 * regardless of which host the portal happens to be served from; without
 * it, fall back to stripping a known admin/partner subdomain prefix off
 * the current hostname (works for the deployed leanandfit.ph setup and
 * for local/preview builds where portal and storefront share one host).
 */
export function buildReferralUrl(referralCode: string): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (configured) {
    return `${configured.replace(/\/+$/, '')}/${referralCode}`;
  }

  const { protocol, hostname, port } = window.location;
  const bareHost = stripPortalPrefix(hostname);
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//${bareHost}${portSuffix}/${referralCode}`;
}

/**
 * A partner's INVITE URL: leanandfit.ph/join/{invite_code} - deliberately
 * a different path than buildReferralUrl's bare /{referral_code} (client
 * request: "not the same as the unique partner link"). This one attributes
 * partner-to-partner recruitment, resolved by pages/Reseller.tsx's
 * /join/:inviteCode route, not the customer-facing /:slug catch-all.
 */
export function buildInviteUrl(inviteCode: string): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (configured) {
    return `${configured.replace(/\/+$/, '')}/join/${inviteCode}`;
  }

  const { protocol, hostname, port } = window.location;
  const bareHost = stripPortalPrefix(hostname);
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//${bareHost}${portSuffix}/join/${inviteCode}`;
}

export type InviteInfo = { inviterName: string; inviterType: PartnerType };

/**
 * Public, pre-submission lookup for the /join/:code landing page - who
 * invited this visitor and what type(s) of partner they can join as.
 * Returns null for an invalid/inactive code (get_invite_info returns no
 * row rather than erroring, so an unrecognized code just reads as "not
 * found" here).
 */
export async function getInviteInfo(inviteCode: string): Promise<InviteInfo | null> {
  const { data, error } = await supabase.rpc('get_invite_info', { p_invite_code: inviteCode });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { inviterName: row.inviter_name, inviterType: row.inviter_type };
}

export type SubmittedLead = {
  partnerId: string;
  status: PartnerStatus;
};

/**
 * Migration 0014 - the public "Become a Partner" form is now a lead
 * capture only (item #7): name/mobile/email/province/city, nothing about
 * type/territory/package/payment. Creates a real `partners` row with
 * status 'pending' so it shows up on the admin Pending Partners tab
 * immediately; admin completes onboarding later via adminCreatePartner()
 * (lib/adminPartners.ts) after calling the lead back.
 *
 * Migration 0025 - `invite` is optional: set when this lead arrived via
 * another partner's /join/{code} link (see pages/Reseller.tsx). When
 * present, the new lead's parent_partner_id/onboarded_by_partner_id and
 * partner_type are set server-side from the invite immediately, rather
 * than waiting for admin to complete onboarding.
 */
export async function submitPartnerLead(
  lead: PartnerLead,
  invite?: { inviteCode: string; partnerType?: PartnerType },
): Promise<SubmittedLead> {
  const { data, error } = await supabase.rpc('submit_partner_lead', {
    p_full_name: lead.fullName,
    p_email: lead.email,
    p_mobile: lead.mobile,
    p_province: lead.province,
    p_city: lead.city,
    p_invite_code: invite?.inviteCode ?? null,
    p_partner_type: invite?.partnerType ?? null,
  });

  if (error) throw new Error(`Failed to submit: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Submission failed.');

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
