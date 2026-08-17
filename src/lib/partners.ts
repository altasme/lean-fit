import { supabase, uploadPaymentProof } from './supabase';
import { calculatePartnerPrice } from './pricing';
import type { PartnerApplication } from './validation';
import type { PartnerPricingTier, PartnerStatus, PartnerType } from '../types/partner';
import { PARTNER_PACKAGE_BOXES } from '../types/partner';
import type { Product } from '../types/product';
import type { PaymentMethodId, PaymentStatus } from '../types/payment';

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
  referenceNumber: string;
  amountPaid: number;
  paymentDate: string;
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
    p_payment_reference: input.referenceNumber,
    p_payment_amount: input.amountPaid,
    p_payment_date: input.paymentDate,
    p_payment_proof_path: proofPath,
  });

  if (error) throw new Error(`Failed to submit payment: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Payment was not submitted.');

  return { partnerId: row.partner_id, paymentStatus: row.payment_status };
}
