import { supabase } from './supabase';
import type { OrderStatus } from '../types/order';

/**
 * Fires the send-order-email Edge Function. Failures are logged, not
 * thrown - email delivery must never block the checkout/admin flow that
 * triggered it (see CLAUDE.md §10).
 */
export async function notifyOrderEvent(
  orderId: string,
  status: OrderStatus,
  opts: { isNewOrder?: boolean } = {},
): Promise<void> {
  const { error } = await supabase.functions.invoke('send-order-email', {
    body: { orderId, status, isNewOrder: opts.isNewOrder ?? false },
  });

  if (error) {
    console.error('Failed to send order email notification:', error);
  }
}
