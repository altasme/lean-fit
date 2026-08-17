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

export type PartnerApplication = {
  fullName: string;
  email: string;
  mobile: string;
  address: string;
  region: string;
  city: string;
  barangay: string;
  partnerType: PartnerType;
};

export type PartnerApplicationErrors = Partial<Record<keyof PartnerApplication, string>>;

export function validatePartnerApplication(app: PartnerApplication): PartnerApplicationErrors {
  const errors: PartnerApplicationErrors = {};

  if (!app.fullName.trim()) errors.fullName = 'Full name is required.';
  if (!EMAIL_RE.test(app.email.trim())) errors.email = 'Enter a valid email address.';
  if (!PH_MOBILE_RE.test(app.mobile.trim())) {
    errors.mobile = 'Enter a valid PH mobile number (e.g. 09171234567).';
  }
  if (!app.address.trim()) errors.address = 'Address is required.';
  if (!app.region.trim()) errors.region = 'Region is required.';
  if (!app.city.trim()) errors.city = 'City / municipality is required.';
  if (!app.barangay.trim()) errors.barangay = 'Barangay is required.';

  return errors;
}

export type ProofFormErrors = {
  referenceNumber?: string;
  amountPaid?: string;
  paymentDate?: string;
  file?: string;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export function validateProof(opts: {
  referenceNumber: string;
  amountPaid: number | null;
  paymentDate: string;
  file: File | null;
}): ProofFormErrors {
  const errors: ProofFormErrors = {};

  if (!opts.referenceNumber.trim()) errors.referenceNumber = 'Reference number is required.';
  if (opts.amountPaid === null || Number.isNaN(opts.amountPaid) || opts.amountPaid <= 0) {
    errors.amountPaid = 'Enter the amount you paid.';
  }
  if (!opts.paymentDate) errors.paymentDate = 'Payment date is required.';

  if (!opts.file) {
    errors.file = 'Upload your proof of payment (JPG, PNG, or PDF).';
  } else if (!ACCEPTED_TYPES.includes(opts.file.type)) {
    errors.file = 'File must be JPG, PNG, or PDF.';
  } else if (opts.file.size > MAX_FILE_BYTES) {
    errors.file = 'File must be 5MB or smaller.';
  }

  return errors;
}
