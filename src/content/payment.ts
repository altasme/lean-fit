/**
 * Payment method details. ⛔ Placeholder account details — client must
 * supply final GCash + bank account info and QR image (see §15.6).
 */

export type PaymentMethod =
  | {
      id: 'gcash';
      label: 'GCash';
      accountName: string;
      accountNumber: string;
      qrImageUrl: string | null;
    }
  | {
      id: 'bank_transfer';
      label: 'Bank Transfer';
      bankName: string;
      accountName: string;
      accountNumber: string;
    };

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'gcash',
    label: 'GCash',
    accountName: 'Lean & Fit Protein Coffee', // ⛔ confirm with client
    accountNumber: '09XX XXX XXXX', // ⛔ confirm with client
    qrImageUrl: null, // ⛔ client to supply GCash QR image
  },
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    bankName: 'TBD', // ⛔ confirm with client
    accountName: 'Lean & Fit Protein Coffee', // ⛔ confirm with client
    accountNumber: 'TBD', // ⛔ confirm with client
  },
];

export const PAYMENT_INSTRUCTIONS =
  'Pay first using your selected method below, then upload your proof of payment to submit your order.';
