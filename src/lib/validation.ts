import type { DeliveryDetails } from '../types/order';
import type { PartnerType } from '../types/partner';

const PH_MOBILE_RE = /^(?:\+63|0)9\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DeliveryFormErrors = Partial<Record<keyof DeliveryDetails, string>>;

export function validateDeliveryDetails(details: DeliveryDetails): DeliveryFormErrors {
  const errors: DeliveryFormErrors = {};

  if (!details.customerName.trim()) errors.customerName = 'Full name is required.';
  if (!PH_MOBILE_RE.test(details.mobile.trim())) {
    errors.mobile = 'Enter a valid PH mobile number (e.g. 09171234567).';
  }
  if (!EMAIL_RE.test(details.email.trim())) errors.email = 'Enter a valid email address.';
  if (!details.address.trim()) errors.address = 'Address is required.';
  if (!details.barangay.trim()) errors.barangay = 'Barangay is required.';
  if (!details.city.trim()) errors.city = 'City / municipality is required.';
  if (!details.province.trim()) errors.province = 'Province is required.';
  if (!details.postalCode.trim()) errors.postalCode = 'Postal code is required.';

  return errors;
}

export function isDeliveryFormValid(details: DeliveryDetails): boolean {
  return Object.keys(validateDeliveryDetails(details)).length === 0;
}

// Identity-only fields (step 1 of the public application - name/mobile/
// email, no partner type or location yet, per the redesigned flow).
export type PartnerIdentity = {
  fullName: string;
  email: string;
  mobile: string;
};

export type PartnerIdentityErrors = Partial<Record<keyof PartnerIdentity, string>>;

export function validatePartnerIdentity(identity: PartnerIdentity): PartnerIdentityErrors {
  const errors: PartnerIdentityErrors = {};

  if (!identity.fullName.trim()) errors.fullName = 'Full name is required.';
  if (!EMAIL_RE.test(identity.email.trim())) errors.email = 'Enter a valid email address.';
  if (!PH_MOBILE_RE.test(identity.mobile.trim())) {
    errors.mobile = 'Enter a valid PH mobile number (e.g. 09171234567).';
  }

  return errors;
}

// Migration 0012: territoryId/barangayName (a real, live, capacity-checked
// pick - src/components/reseller/TerritoryPicker.tsx) replaced free-text
// region/city/barangay. territoryId is the city id for Reseller/
// Distributor, the region id for Franchise; barangayName only applies to
// Reseller (the barangay itself may not exist as a row yet - resolved/
// lazily created server-side, see resolve_and_reserve_territory()).
export type PartnerApplication = PartnerIdentity & {
  address: string;
  partnerType: PartnerType;
  territoryId: string;
  barangayName: string | null;
};

export type PartnerApplicationErrors = Partial<Record<keyof PartnerApplication, string>>;

export function validatePartnerApplication(app: PartnerApplication): PartnerApplicationErrors {
  const errors: PartnerApplicationErrors = { ...validatePartnerIdentity(app) };

  if (!app.address.trim()) errors.address = 'Address is required.';
  if (!app.territoryId) errors.territoryId = 'Select your location.';
  if (app.partnerType === 'reseller' && !app.barangayName) errors.barangayName = 'Select a barangay.';

  return errors;
}

// Part 2 §1 Route B - partner-assisted onboarding. Same shape as the
// application above, minus needing PartnerIdentity's own errors object
// (kept separate historically; unified here since both now share the
// same territory fields).
export type OnboardPartnerInput = {
  fullName: string;
  email: string;
  mobile: string;
  address: string;
  partnerType: PartnerType;
  territoryId: string;
  barangayName: string | null;
};

export type OnboardPartnerErrors = Partial<Record<keyof OnboardPartnerInput, string>>;

export function validateOnboardPartner(input: OnboardPartnerInput): OnboardPartnerErrors {
  const errors: OnboardPartnerErrors = {};

  if (!input.fullName.trim()) errors.fullName = 'Full name is required.';
  if (!EMAIL_RE.test(input.email.trim())) errors.email = 'Enter a valid email address.';
  if (!PH_MOBILE_RE.test(input.mobile.trim())) {
    errors.mobile = 'Enter a valid PH mobile number (e.g. 09171234567).';
  }
  if (!input.address.trim()) errors.address = 'Address is required.';
  if (!input.territoryId) errors.territoryId = 'Select a territory.';
  if (input.partnerType === 'reseller' && !input.barangayName) errors.barangayName = 'Select a barangay.';

  return errors;
}

export type ProofFormErrors = {
  file?: string;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

// Screenshot-only (sitewide simplification - reference number / amount
// paid / payment date fields were dropped; the RPCs already tolerate null
// for those columns, see create_order_with_payment's coalesce fallback).
export function validateProof(opts: { file: File | null }): ProofFormErrors {
  const errors: ProofFormErrors = {};

  if (!opts.file) {
    errors.file = 'Upload your proof of payment (JPG, PNG, or PDF).';
  } else if (!ACCEPTED_TYPES.includes(opts.file.type)) {
    errors.file = 'File must be JPG, PNG, or PDF.';
  } else if (opts.file.size > MAX_FILE_BYTES) {
    errors.file = 'File must be 5MB or smaller.';
  }

  return errors;
}
