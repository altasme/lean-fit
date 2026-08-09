export type OrderStatus =
  | 'pending_payment'
  | 'payment_verification'
  | 'payment_approved'
  | 'packing'
  | 'shipped'
  | 'completed'
  | 'payment_rejected';

export type PaymentMethodId = 'gcash' | 'bank_transfer';

export type Order = {
  id: string;
  order_no: string;
  customer_name: string;
  email: string;
  mobile: string;
  address: string;
  barangay: string;
  city: string;
  province: string;
  postal_code: string;
  delivery_notes: string | null;
  product: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethodId;
  payment_reference: string | null;
  payment_amount: number | null;
  payment_date: string | null;
  payment_proof_path: string | null;
  status: OrderStatus;
  courier: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderStatusHistory = {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
};

export type DeliveryDetails = {
  customerName: string;
  mobile: string;
  email: string;
  address: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  deliveryNotes?: string;
};

export type PaymentProof = {
  method: PaymentMethodId;
  referenceNumber: string;
  amountPaid: number;
  paymentDate: string;
  file: File | null;
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending Payment',
  payment_verification: 'Payment Verification',
  payment_approved: 'Payment Approved',
  packing: 'Packing',
  shipped: 'Shipped',
  completed: 'Completed',
  payment_rejected: 'Payment Rejected',
};

export const STATUS_EMOJI: Record<OrderStatus, string> = {
  pending_payment: '⚪',
  payment_verification: '🟡',
  payment_approved: '🟢',
  packing: '🟣',
  shipped: '🔵',
  completed: '✅',
  payment_rejected: '🔴',
};
