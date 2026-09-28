import { supabase } from './supabase';
import { functionErrorMessage } from './functionsError';

/**
 * Starts a Ganap hosted-checkout session for an order that was already
 * created (retail: createOrder(), method 'ganap'; partner self-order:
 * partner_create_order()) - see supabase/functions/ganap-checkout. Only
 * `orderId`/`paymentId` are sent; the function re-fetches the
 * authoritative amount/customer info itself rather than trusting anything
 * the client could tamper with. Pass `context: 'partner'` when called from
 * the partner portal so Ganap's post-payment redirect lands back on the
 * partner subdomain's dashboard instead of the public site.
 *
 * Throws with a real, specific message (via functionErrorMessage) rather
 * than supabase-js's generic "non-2xx status code" - see functionsError.ts.
 */
export async function startGanapCheckout(
  orderId: string,
  paymentId: string,
  context?: 'partner',
): Promise<{ redirectUrl: string }> {
  const { data, error } = await supabase.functions.invoke('ganap-checkout', {
    body: { orderId, paymentId, context },
  });

  if (error) {
    throw new Error(await functionErrorMessage(error));
  }
  if (!data?.redirectUrl) {
    throw new Error('Ganap did not return a payment link. Please try again.');
  }

  return { redirectUrl: data.redirectUrl as string };
}

/**
 * Polls Ganap's transaction status for an order stuck at payment.status
 * 'pending' - used as a fallback on /order-confirmed (in case the webhook
 * hasn't landed yet) and from an admin "Check Ganap Status" control. Safe
 * to call repeatedly - see supabase/functions/ganap-check-status.
 */
export async function checkGanapStatus(orderId: string): Promise<{ status: string; paid: boolean }> {
  const { data, error } = await supabase.functions.invoke('ganap-check-status', {
    body: { orderId },
  });

  if (error) {
    throw new Error(await functionErrorMessage(error));
  }

  return { status: data?.status ?? 'pending', paid: Boolean(data?.paid) };
}
