// Supabase Edge Function - polls Ganap's Status & Retry API for one order's
// payment and settles it exactly like ganap-webhook would, if it hasn't
// settled already. Two callers:
//   - src/pages/OrderConfirmed.tsx, briefly after the customer lands back
//     from Ganap (fallback in case the webhook is slow or never arrives -
//     Ganap's own docs say "you do not have to wait for us... ask for the
//     payment's status").
//   - the admin "Check Ganap Status" control (StatusControls.tsx), for a
//     Ganap order stuck at payment.status 'pending' - see the Payment
//     Review section there for the manual-method equivalent.
//
// Deliberately duplicates ganap-webhook's settlement logic rather than
// sharing a module - see supabase/README.md for why (these functions may
// need to be pasted as self-contained files into the Supabase Dashboard
// editor when the deploying user has no CLI access).
//
// Safe to call as often as needed - Ganap's status endpoint "changes
// nothing" per their docs, and settlement here is the same idempotent
// paid-status check ganap-webhook uses (skips re-processing if the
// payment is already 'paid').
//
// Secrets required (set with `supabase secrets set KEY=value`):
//   GANAP_PROJECT_UUID, GANAP_SIGNING_SECRET
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';

const GANAP_PROJECT_UUID = Deno.env.get('GANAP_PROJECT_UUID') ?? '';
const GANAP_SIGNING_SECRET = Deno.env.get('GANAP_SIGNING_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GANAP_STATUS_URL = 'https://convex-top-api.ganap.net/v1/transactions/status';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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

async function fireSettlementEmail(orderId: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-order-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ orderId, event: 'payment_approved', isNewOrder: true }),
    });
    if (!res.ok) console.error('send-order-email call failed:', res.status, await res.text());
  } catch (err) {
    console.error('send-order-email call threw:', err);
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (!GANAP_PROJECT_UUID || !GANAP_SIGNING_SECRET) {
      return jsonResponse({ error: 'Payment gateway is not configured yet.' }, 500);
    }

    const { orderId } = await req.json();
    if (!orderId) return jsonResponse({ error: 'orderId is required' }, 400);

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();
    if (paymentError || !payment) return jsonResponse({ error: 'Payment not found' }, 404);
    if (payment.provider !== 'ganap') return jsonResponse({ error: 'Not a Ganap payment' }, 400);

    if (payment.status === 'paid') {
      return jsonResponse({ status: 'paid', paid: true });
    }
    if (!payment.provider_txn_id) {
      return jsonResponse({ status: 'pending', paid: false });
    }

    const ganapBody = JSON.stringify({
      projectUuid: GANAP_PROJECT_UUID,
      referenceNumber: payment.provider_txn_id,
    });
    const signature = await hmacSha256Hex(GANAP_SIGNING_SECRET, ganapBody);

    const ganapRes = await fetch(GANAP_STATUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Ganap-Signature': signature },
      body: ganapBody,
    });

    if (!ganapRes.ok) {
      const text = await ganapRes.text();
      console.error('Ganap status check failed:', ganapRes.status, text);
      return jsonResponse({ status: 'pending', paid: false });
    }

    const ganapData = (await ganapRes.json()) as { status?: string; paid?: boolean };
    const status = ganapData.status ?? 'pending';
    const paid = Boolean(ganapData.paid);

    if (paid || status === 'paid') {
      const { error: paymentUpdateError } = await supabaseAdmin
        .from('payments')
        .update({ status: 'paid', verified_at: new Date().toISOString() })
        .eq('id', payment.id);
      if (paymentUpdateError) return jsonResponse({ error: paymentUpdateError.message }, 500);

      await supabaseAdmin
        .from('payment_status_history')
        .insert({ payment_id: payment.id, status: 'paid', note: 'Settled via Ganap status check' });

      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('id', payment.order_id)
        .maybeSingle();
      if (order && order.status === 'pending') {
        await supabaseAdmin.from('orders').update({ status: 'confirmed' }).eq('id', order.id);
        await supabaseAdmin
          .from('order_status_history')
          .insert({ order_id: order.id, status: 'confirmed', note: 'Auto-confirmed - Ganap payment verified' });
      }

      await fireSettlementEmail(payment.order_id);
      return jsonResponse({ status: 'paid', paid: true });
    }

    if (status === 'failed' || status === 'expired') {
      await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      await supabaseAdmin
        .from('payment_status_history')
        .insert({ payment_id: payment.id, status: 'failed', note: `Ganap reported "${status}" (status check)` });
      return jsonResponse({ status, paid: false });
    }

    return jsonResponse({ status: 'pending', paid: false });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
