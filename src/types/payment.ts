// Payment lifecycle, independent of order fulfillment - see types/order.ts
// and CLAUDE.md §6/§10 for the Order -> Payment -> Provider split.
// 'gcash'/'maya'/'bank_transfer' are retired from active checkout (client
// request: replaced by the single 'ganap' gateway method) but stay valid
// here forever - historical orders placed under them still need to
// render correctly in admin.
export type PaymentMethodId = 'gcash' | 'maya' | 'bank_transfer' | 'ganap' | 'cod';

// 'manual' covered GCash/Maya/Bank Transfer (retired from active checkout,
// kept for historical orders). 'ganap' is the live gateway - GCash/Maya/
// Online Banking via Ganap's hosted QR Ph checkout, auto-verified by
// webhook, no admin review. 'cod' is its own provider (no verification
// gate). This is the CLAUDE.md §13 "future provider" slot actually being
// used now.
export type PaymentProvider = 'manual' | 'ganap' | 'cod';

export type PaymentStatus =
  | 'pending'
  | 'pending_verification'
  | 'paid'
  | 'failed'
  | 'rejected'
  | 'refunded'
  | 'cancelled';

export type Payment = {
  id: string;
  payment_no: string;
  order_id: string;
  method: PaymentMethodId;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  reference: string | null;
  proof_path: string | null;
  payment_date: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  provider_txn_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentStatusHistory = {
  id: string;
  payment_id: string;
  status: PaymentStatus;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

/** Checkout-side proof-of-payment form input (manual methods only, screenshot only). */
export type PaymentProofInput = {
  method: PaymentMethodId;
  file: File | null;
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  pending_verification: 'Pending Verification',
  paid: 'Paid',
  failed: 'Failed',
  rejected: 'Rejected',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_EMOJI: Record<PaymentStatus, string> = {
  pending: '⚪',
  pending_verification: '🟡',
  paid: '🟢',
  failed: '🔴',
  rejected: '🔴',
  refunded: '🟣',
  cancelled: '⚫',
};
