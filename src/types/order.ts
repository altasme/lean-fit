import type { PartnerType } from './partner';

// Fulfillment lifecycle only - payment lives in its own record, see
// types/payment.ts. Do not merge these two axes; see CLAUDE.md §10.
export type OrderStatus = 'pending' | 'confirmed' | 'packing' | 'shipped' | 'completed' | 'cancelled';

// Part 2 addendum §33 - always 'lean_and_fit_dropship' today (migration
// 0011's default): every order that exists in this table came through
// the website checkout, the only fulfillment path built. No partner-run
// inventory/manual-fulfillment system exists to ever set the other
// value - see supabase/README.md's Part 2 scope note.
export type FulfillmentMethod = 'lean_and_fit_dropship' | 'partner_fulfillment';

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
  status: OrderStatus;
  courier: string | null;
  tracking_number: string | null;
  // Referral/partner attribution - Reseller Portal Part 1 §48/§54. All
  // snapshotted at order creation time (§55 historical integrity), not
  // live-derived from the referenced partner's current state.
  ref_code: string | null;
  referral_partner_id: string | null;
  referral_partner_type: PartnerType | null;
  referral_parent_partner_id: string | null;
  referral_territory_id: string | null;
  partner_price: number | null;
  partner_earnings: number | null;
  fulfillment_method: FulfillmentMethod;
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

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  packing: 'Packing',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_EMOJI: Record<OrderStatus, string> = {
  pending: '⚪',
  confirmed: '🟢',
  packing: '🟣',
  shipped: '🔵',
  completed: '✅',
  cancelled: '⚫',
};

export const FULFILLMENT_METHOD_LABELS: Record<FulfillmentMethod, string> = {
  lean_and_fit_dropship: 'Lean & Fit Dropship',
  partner_fulfillment: 'Partner Fulfillment',
};
