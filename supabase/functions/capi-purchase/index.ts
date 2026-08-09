// Supabase Edge Function — CAPI Purchase stub (phase 2, not MVP-blocking).
//
// CLAUDE.md §8: once volume allows, fire a server-side event on admin
// "Payment Approved" — a clean, verified-revenue signal deduped against
// the client-side Purchase pixel event via `eventID = orderId`.
//
// Wiring this up (not done yet):
//   1. Call this function from the admin "Approve Payment" action
//      (StatusControls in src/components/admin/StatusControls.tsx), passing
//      { orderId }.
//   2. Set META_CAPI_TOKEN via `supabase secrets set META_CAPI_TOKEN=...`.
//   3. Decide: dedupe as `Purchase` (same eventID as the client pixel event)
//      or send a distinct `PaymentVerified` custom event and switch ad
//      optimization to it once volume allows. This stub sends `Purchase`.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const META_CAPI_TOKEN = Deno.env.get('META_CAPI_TOKEN') ?? '';
const META_PIXEL_ID = Deno.env.get('META_PIXEL_ID') ?? '';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
  if (!META_CAPI_TOKEN || !META_PIXEL_ID) {
    return new Response(
      JSON.stringify({ error: 'CAPI not configured — set META_CAPI_TOKEN and META_PIXEL_ID' }),
      { status: 501 },
    );
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId is required' }), { status: 400 });
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: order.id, // dedupe against the client-side pixel Purchase event
          action_source: 'website',
          user_data: {
            em: [await sha256(order.email.trim().toLowerCase())],
            ph: [await sha256(order.mobile.replace(/\D/g, ''))],
          },
          custom_data: {
            value: order.total,
            currency: 'PHP',
            content_ids: ['lf-classic'],
            num_items: order.quantity,
          },
        },
      ],
    };

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `Meta CAPI error: ${text}` }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
