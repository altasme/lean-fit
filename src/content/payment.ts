/**
 * Payment method configuration - CLAUDE.md §6a. Config-driven so adding a
 * method never requires touching checkout/order/admin structure.
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
    code: 'cod',
    label: 'Cash on Delivery',
    provider: 'cod',
    requiresProof: false,
    instructions: 'Pay in cash when your order arrives.',
  },
];
