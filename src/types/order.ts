import type { PartnerType } from './partner';

// Fulfillment lifecycle only - payment lives in its own record, see
// types/payment.ts. Do not merge these two axes; see CLAUDE.md §10.
// 'returned' (Return to Seller / RTS) is a shipped-stage exception - the
// courier never delivered it. Deliberately excluded from revenue
// reporting regardless of payment status - see components/admin/OrderStats.tsx.
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'packing'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'returned';

// Part 2 addendum §33 - always 'lean_and_fit_dropship' today (migration
// 0011's default): every order that exists in this table came through
// the website checkout, the only fulfillment path built. No partner-run
// inventory/manual-fulfillment system exists to ever set the other
// value - see supabase/README.md's Part 2 scope note.
export type FulfillmentMethod = 'lean_and_fit_dropship' | 'partner_fulfillment';

// 'retail' = every checkout-created order (default, untouched). The other
// three are wholesale/restock orders an admin manually keys in for an
// existing ACTIVE partner buying more stock at their tier price - NOT a
// referred retail sale, so they never populate referral_partner_id/
// partner_earnings (see migration 0023).
export type OrderType = 'retail' | 'reseller' | 'distributor' | 'franchise';

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
  // Traceability only - unit_price/subtotal already reflect whatever
  // discount actually applied (product promo or discount code); these two
  // just record which one (if any) so admin isn't left guessing.
  discount_amount: number;
  applied_promotion_id: string | null;
  // Manually-added wholesale/restock order (migration 0023). 'retail' for
  // every normal checkout order. partner_id is who the restock is for -
  // distinct from referral_partner_id above, which tracks referred sales.
  order_type: OrderType;
  partner_id: string | null;
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
  returned: 'Returned to Seller',
};

export const ORDER_STATUS_EMOJI: Record<OrderStatus, string> = {
  pending: '⚪',
  confirmed: '🟢',
  packing: '🟣',
  shipped: '🔵',
  completed: '✅',
  cancelled: '⚫',
  returned: '↩️',
};

export const FULFILLMENT_METHOD_LABELS: Record<FulfillmentMethod, string> = {
  lean_and_fit_dropship: 'Lean & Fit Dropship',
  partner_fulfillment: 'Partner Fulfillment',
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  retail: 'Retail',
  reseller: 'Reseller Order',
  distributor: 'Distributor Order',
  franchise: 'Franchise Order',
};

export const ORDER_TYPE_PREFIX: Record<OrderType, string> = {
  retail: 'LF',
  reseller: 'RO',
  distributor: 'DO',
  franchise: 'FO',
};
