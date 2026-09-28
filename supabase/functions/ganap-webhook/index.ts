// Supabase Edge Function - receives Ganap's payment-outcome webhook and
// settles the matching payment/order. This is the ONLY place a Ganap
// payment gets marked 'paid' outside of the admin's manual "Check Ganap
// Status" fallback (ganap-check-status) - there is no human review step
// for this gateway (CLAUDE.md §10's "Future PayMongo" flow, now actually
// wired up for Ganap instead).
//
// NOT invoked via supabase.functions.invoke() from the browser - Ganap
// calls this directly over the public internet, so it is verified by
// HMAC signature (X-Ganap-Signature), not a Supabase JWT. Deploy with
// `supabase functions deploy ganap-webhook --no-verify-jwt` (see
// supabase/README.md) so Supabase's gateway doesn't also demand an
// Authorization header Ganap has no reason to send.
//
// Configure this function's URL as the Endpoint URL in the Ganap
// dashboard (replacing the placeholder https://leanandfit.ph/test):
//   https://<project-ref>.supabase.co/functions/v1/ganap-webhook
//
// Idempotent by design - Ganap's docs say it may retry delivery, and the
// Status & Retry API can also be used to resend, so this must be safe to
// run twice for the same reference number (checked via payments.status
// already being 'paid').
//
// Secrets required (set with `supabase secrets set KEY=value`):
//   GANAP_SIGNING_SECRET
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// Reuses RESEND_API_KEY/EMAIL_FROM indirectly, via a server-to-server call
// to the existing send-order-email function - nothing new to configure
// for email.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';

const GANAP_SIGNING_SECRET = Deno.env.get('GANAP_SIGNING_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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

async function findPayment(payload: Record<string, unknown>) {
  const referenceNumber = payload.referenceNumber as string | undefined;
  const metadata = (payload.metadata ?? {}) as Record<string, unknown>;
  const paymentIdFromMetadata = metadata.payment_id as string | undefined;
  const externalReference = payload.externalReference as string | undefined;

  if (referenceNumber) {
    const { data } = await supabaseAdmin.from('payments').select('*').eq('provider_txn_id', referenceNumber).maybeSingle();
    if (data) return data;
  }
  if (paymentIdFromMetadata) {
    const { data } = await supabaseAdmin.from('payments').select('*').eq('id', paymentIdFromMetadata).maybeSingle();
    if (data) return data;
  }
  if (externalReference) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('order_no', externalReference)
      .maybeSingle();
    if (order) {
      const { data } = await supabaseAdmin.from('payments').select('*').eq('order_id', order.id).maybeSingle();
      if (data) return data;
    }
  }
  return null;
}

/** Fire-and-forget-ish: failures are logged, never thrown - a settled payment must not be undone by an email hiccup. */
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
    if (!res.ok) {
      console.error('send-order-email call failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('send-order-email call threw:', err);
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (!GANAP_SIGNING_SECRET) {
      console.error('ganap-webhook is missing GANAP_SIGNING_SECRET');
      return jsonResponse({ error: 'Not configured' }, 500);
    }

    const rawBody = await req.text();
    const signature = req.headers.get('X-Ganap-Signature') ?? '';
    const expectedSignature = await hmacSha256Hex(GANAP_SIGNING_SECRET, rawBody);

    if (!signature || signature !== expectedSignature) {
      console.error('ganap-webhook signature mismatch');
      return jsonResponse({ error: 'Invalid signature' }, 401);
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const event = payload.event as string | undefined;
    const status = payload.status as string | undefined;
    const paid = Boolean(payload.paid);
    const referenceNumber = payload.referenceNumber as string | undefined;

    // Ganap's real webhook payload has no `event`/`status` field for a plain
    // status poll response, but DOES for the actual webhook delivery - only
    // require `event` to look like a real webhook when it's present at all,
    // so this still works from a manual redelivery/test that might omit it.
    if (event && event !== 'transaction.paid') {
      return jsonResponse({ ok: true, note: `ignored event "${event}"` });
    }

    const payment = await findPayment(payload);
    if (!payment) {
      console.error('ganap-webhook: no matching payment found for', referenceNumber);
      return jsonResponse({ error: 'Payment not found' }, 404);
    }

    // Idempotent - Ganap delivers at-least-once (retries/manual redelivery
    // can resend the same event), and this must never double-fire the
    // settlement email.
    if (payment.status === 'paid') {
      return jsonResponse({ ok: true, note: 'already settled' });
    }

    if (referenceNumber && payment.provider_txn_id !== referenceNumber) {
      await supabaseAdmin.from('payments').update({ provider_txn_id: referenceNumber }).eq('id', payment.id);
    }

    if (paid || status === 'paid') {
      const { error: paymentUpdateError } = await supabaseAdmin
        .from('payments')
        .update({ status: 'paid', verified_at: new Date().toISOString() })
        .eq('id', payment.id);
      if (paymentUpdateError) {
        console.error('Failed to mark payment paid:', paymentUpdateError);
        return jsonResponse({ error: paymentUpdateError.message }, 500);
      }

      await supabaseAdmin
        .from('payment_status_history')
        .insert({ payment_id: payment.id, status: 'paid', note: 'Settled via Ganap webhook' });

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
      return jsonResponse({ ok: true });
    }

    if (status === 'failed' || status === 'expired') {
      const { error: paymentUpdateError } = await supabaseAdmin
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);
      if (paymentUpdateError) {
        console.error('Failed to mark payment failed:', paymentUpdateError);
        return jsonResponse({ error: paymentUpdateError.message }, 500);
      }
      await supabaseAdmin
        .from('payment_status_history')
        .insert({ payment_id: payment.id, status: 'failed', note: `Ganap reported "${status}"` });
      return jsonResponse({ ok: true });
    }

    // 'pending' or anything else Ganap might send later - nothing to settle yet.
    return jsonResponse({ ok: true, note: `no action for status "${status}"` });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
