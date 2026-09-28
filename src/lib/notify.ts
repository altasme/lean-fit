import { supabase } from './supabase';
import { functionErrorMessage } from './functionsError';
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
    console.error('Failed to send order email notification:', await functionErrorMessage(error));
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
    console.error('Failed to send partner email notification:', await functionErrorMessage(error));
  }
}

/**
 * Fires the notify-discord Edge Function (client request: "connect this to
 * Discord... new partner sign up notifications"), right after a public
 * lead submission succeeds. Same fire-and-forget contract as the two
 * functions above - a Discord outage (or the webhook simply not being
 * configured yet) must never block the application flow.
 */
export async function notifyDiscordNewPartner(partnerId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('notify-discord', {
    body: { event: 'new_partner', partnerId },
  });

  if (error) {
    console.error('Failed to send Discord new-partner notification:', await functionErrorMessage(error));
  }
}
