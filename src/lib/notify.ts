import { supabase } from './supabase';
import type { OrderEmailEvent, PartnerEmailEvent } from '../content/emails';

/**
 * Fires the send-order-email Edge Function. Failures are logged, not
 * thrown - email delivery must never block the checkout/admin flow that
 * triggered it (see CLAUDE.md §10).
 */
export async function notifyOrderEvent(
  orderId: string,
  event: OrderEmailEvent,
  opts: { isNewOrder?: boolean } = {},
): Promise<void> {
  const { error } = await supabase.functions.invoke('send-order-email', {
    body: { orderId, event, isNewOrder: opts.isNewOrder ?? false },
  });

  if (error) {
    console.error('Failed to send order email notification:', error);
  }
}

/**
 * Fires the send-partner-email Edge Function (Issue #1's "we're reviewing
 * your payment" confirmation, sent right after package payment submission -
 * see submitPartnerPackagePayment). Same fire-and-forget contract as
 * notifyOrderEvent - email delivery must never block the application flow.
 */
export async function notifyPartnerEvent(partnerId: string, event: PartnerEmailEvent): Promise<void> {
  const { error } = await supabase.functions.invoke('send-partner-email', {
    body: { partnerId, event },
  });

  if (error) {
    console.error('Failed to send partner email notification:', error);
  }
}
