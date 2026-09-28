// Supabase Edge Function - starts a Ganap hosted-checkout session for an
// order already created client-side via create_order_with_payment (method
// 'ganap' - see migration 0027). Invoked right after that RPC succeeds
// (src/lib/ganap.ts's startGanapCheckout, called from Checkout.tsx).
//
// Ganap is a hosted-checkout-redirect gateway covering GCash/Maya/online
// banking behind a single QR Ph page (client request: replace the three
// separate manual GCash/Maya/Bank Transfer methods on retail checkout with
// this one automated method - CLAUDE.md's Order -> Payment -> Provider
// split is exactly what makes this a config/branch change instead of a
// checkout rebuild, see §6/§13).
//
// Also used by the partner portal's self-order flow (migration 0031 -
// client request: switch partner self-ordering off manual proof-upload
// onto this same gateway) via the optional `context: "partner"` body
// field - only changes which origin/path Ganap redirects the browser back
// to after payment (the partner subdomain's dashboard instead of the
// public site's /order-confirmed). Everything else - amount lookup,
// signing, webhook settlement - is identical and already order_type-
// agnostic, so no other change was needed for that reuse.
//
// SECURITY: the amount charged is always re-read from `orders`/`payments`
// here, server-side, via the service-role client - the browser only ever
// sends orderId/paymentId, never an amount, so a tampered client request
// can't change what Ganap charges.
//
// ⚠️ UNVERIFIED ASSUMPTION: Ganap's docs give `"amount":1000` as an example
// with no stated unit. This sends the order's raw PHP total as-is (e.g.
// ₱1500 order -> `"amount":1500`), NOT converted to centavos. Confirm this
// with Ganap (dashboard/support) and test with one real small transaction
// before relying on it - if Ganap actually expects centavos, every charge
// would be off by 100x.
//
// Secrets required (set with `supabase secrets set KEY=value`):
//   GANAP_PROJECT_UUID, GANAP_SIGNING_SECRET, SITE_URL
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically.
//   `SITE_URL` is the public marketing site's origin (e.g.
//   https://leanandfit.ph, no trailing slash) - used to build the
//   successRedirectUrl Ganap sends the customer back to.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';

const GANAP_PROJECT_UUID = Deno.env.get('GANAP_PROJECT_UUID') ?? '';
const GANAP_SIGNING_SECRET = Deno.env.get('GANAP_SIGNING_SECRET') ?? '';
const SITE_URL = (Deno.env.get('SITE_URL') ?? '').replace(/\/+$/, '');
const GANAP_CHECKOUT_URL = 'https://convex-top-api.ganap.net/v1/checkout';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

/** partner.leanandfit.ph from https://leanandfit.ph - see supabase/README.md's subdomain routing note. */
function partnerOrigin(siteUrl: string): string {
  try {
    const u = new URL(siteUrl);
    return `${u.protocol}//partner.${u.host}`;
  } catch {
    return siteUrl;
  }
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (!GANAP_PROJECT_UUID || !GANAP_SIGNING_SECRET || !SITE_URL) {
      console.error('ganap-checkout is missing required secrets (GANAP_PROJECT_UUID/GANAP_SIGNING_SECRET/SITE_URL)');
      return jsonResponse({ error: 'Payment gateway is not configured yet. Please try again later.' }, 500);
    }

    const { orderId, paymentId, context } = await req.json();
    if (!orderId || !paymentId) {
      return jsonResponse({ error: 'orderId and paymentId are required' }, 400);
    }
    const isPartner = context === 'partner';

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_no, customer_name, email, total')
      .eq('id', orderId)
      .single();
    if (orderError || !order) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('id, order_id, provider, status, payment_no')
      .eq('id', paymentId)
      .single();
    if (paymentError || !payment || payment.order_id !== order.id) {
      return jsonResponse({ error: 'Payment not found for this order' }, 404);
    }
    if (payment.provider !== 'ganap') {
      return jsonResponse({ error: 'This payment is not a Ganap gateway payment' }, 400);
    }
    if (payment.status === 'paid') {
      return jsonResponse({ error: 'This order has already been paid.' }, 409);
    }

    const successRedirectUrl = isPartner
      ? `${partnerOrigin(SITE_URL)}/reseller/dashboard?gateway=1` +
        `&order_no=${encodeURIComponent(order.order_no)}` +
        `&order_id=${encodeURIComponent(order.id)}`
      : `${SITE_URL}/order-confirmed?gateway=1` +
        `&order_no=${encodeURIComponent(order.order_no)}` +
        `&order_id=${encodeURIComponent(order.id)}` +
        `&customer=${encodeURIComponent(order.customer_name)}`;

    const ganapBody = JSON.stringify({
      projectUuid: GANAP_PROJECT_UUID,
      amount: Number(order.total),
      idempotencyKey: payment.payment_no,
      customerName: order.customer_name,
      customerEmail: order.email,
      externalReference: order.order_no,
      metadata: { order_id: order.id, payment_id: payment.id },
      successRedirectUrl,
    });

    const signature = await hmacSha256Hex(GANAP_SIGNING_SECRET, ganapBody);

    const ganapRes = await fetch(GANAP_CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Ganap-Signature': signature },
      body: ganapBody,
    });

    const ganapText = await ganapRes.text();
    let ganapData: Record<string, unknown> = {};
    try {
      ganapData = JSON.parse(ganapText);
    } catch {
      // fall through with an empty object - handled by the !ganapRes.ok check below
    }

    if (!ganapRes.ok || !ganapData.redirectUrl) {
      console.error('Ganap checkout request failed:', ganapRes.status, ganapText);
      return jsonResponse({ error: 'Could not start the payment - please try again.' }, 502);
    }

    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({ provider_txn_id: ganapData.referenceNumber ?? null })
      .eq('id', payment.id);
    if (updateError) {
      console.error('Failed to store Ganap reference number:', updateError);
    }

    return jsonResponse({ redirectUrl: ganapData.redirectUrl });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
