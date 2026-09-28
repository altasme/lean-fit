import { supabase } from './supabase';
import type { OrderStatus } from '../types/order';
import type { PaymentStatus } from '../types/payment';

export type TrackedOrder = {
  orderNo: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  product: string;
  quantity: number;
  courier: string | null;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Public "Track My Order" lookup (footer link, no login) - see migration
 * 0028's track_order RPC. Matches by order number OR shipping tracking
 * number; returns null for no match rather than throwing, since "not
 * found" is an expected, ordinary result here (a typo, or an order that
 * doesn't exist), not an error condition.
 */
export async function trackOrder(query: string): Promise<TrackedOrder | null> {
  const { data, error } = await supabase.rpc('track_order', { p_query: query });
  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    orderNo: row.order_no,
    status: row.status,
    paymentStatus: row.payment_status,
    product: row.product,
    quantity: row.quantity,
    courier: row.courier,
    trackingNumber: row.tracking_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
