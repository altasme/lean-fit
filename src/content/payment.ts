/**
 * Payment method configuration - CLAUDE.md §6a. Config-driven so adding a
 * method never requires touching checkout/order/admin structure.
 *
 * Client request: the customer-facing checkout page now offers exactly
 * two methods - a single "GCash / Maya / Online Banking" method powered
 * by the Ganap gateway (redirects to Ganap's hosted page, which shows a
 * QR Ph code covering all three rails - see
 * supabase/functions/ganap-checkout) and Cash on Delivery. See
 * `RETAIL_CHECKOUT_METHODS` below for that filtered list.
 *
 * The original manual GCash/Maya/Bank Transfer methods (proof-of-payment
 * screenshot, admin review) are NOT removed from `PAYMENT_METHODS` - only
 * retired from retail checkout. They're still actively used by the
 * partner package payment flow (PackagePaymentStep.tsx) and admin's
 * manual wholesale order form (AdminOrderCreate.tsx/AdminPartnerCreate.tsx),
 * neither of which this request touches - those still filter
 * `provider === 'manual'` out of the full list below.
 *
 * ⛔ Placeholder account details/QR - client must supply final GCash, Maya,
 * and bank account info + QR images (see CLAUDE.md §15.6).
 */

export type PaymentMethodConfig =
  | {
      code: 'gcash' | 'maya';
      label: string;
      provider: 'manual';
      requiresProof: true;
      instructions: string;
      account: { name: string; number: string };
      qr: string | null;
    }
  | {
      code: 'bank_transfer';
      label: string;
      provider: 'manual';
      requiresProof: true;
      instructions: string;
      account: { bank: string; name: string; number: string };
    }
  | {
      code: 'ganap';
      label: string;
      provider: 'ganap';
      requiresProof: false;
      instructions: string;
    }
  | {
      code: 'cod';
      label: string;
      provider: 'cod';
      requiresProof: false;
      instructions: string;
    };

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    code: 'gcash',
    label: 'GCash',
    provider: 'manual',
    requiresProof: true,
    instructions: 'Pay first via GCash, then upload your proof of payment to submit your order.',
    account: {
      name: 'Lean & Fit Protein Coffee', // ⛔ confirm with client
      number: '09XX XXX XXXX', // ⛔ confirm with client
    },
    qr: null, // ⛔ client to supply GCash QR image
  },
  {
    code: 'maya',
    label: 'Maya',
    provider: 'manual',
    requiresProof: true,
    instructions: 'Pay first via Maya, then upload your proof of payment to submit your order.',
    account: {
      name: 'Lean & Fit Protein Coffee', // ⛔ confirm with client
      number: '09XX XXX XXXX', // ⛔ confirm with client
    },
    qr: null, // ⛔ client to supply Maya QR image
  },
  {
    code: 'bank_transfer',
    label: 'Bank Transfer',
    provider: 'manual',
    requiresProof: true,
    instructions:
      'Pay first via bank transfer, then upload your proof of payment to submit your order.',
    account: {
      bank: 'TBD', // ⛔ confirm with client
      name: 'Lean & Fit Protein Coffee', // ⛔ confirm with client
      number: 'TBD', // ⛔ confirm with client
    },
  },
  {
    code: 'ganap',
    label: 'GCash / Maya / Online Banking',
    provider: 'ganap',
    requiresProof: false,
    instructions:
      "You'll be redirected to a secure payment page where you can pay via GCash, Maya, or online banking (QR Ph). Your order is confirmed automatically once payment clears - no need to upload a screenshot.",
  },
  {
    code: 'cod',
    label: 'Cash on Delivery',
    provider: 'cod',
    requiresProof: false,
    instructions: 'Pay in cash when your order arrives.',
  },
];

/** Retail checkout's payment method list - see the module doc above. */
export const RETAIL_CHECKOUT_METHODS: PaymentMethodConfig[] = PAYMENT_METHODS.filter(
  (m) => m.code === 'ganap' || m.code === 'cod',
);
