// Supabase Edge Function - the ONLY way a Cash on Delivery order can be
// created (see migration 0032's guard on create_order_with_payment's
// 'cod' branch). Client request: "add a captcha before a Cash on delivery
// order gets submitted... to protect from spam orders."
//
// Verifies the browser's Cloudflare Turnstile token server-side against
// Cloudflare's siteverify API, then - only on success - creates the order
// via create_order_with_payment using the SERVICE ROLE client (which
// satisfies the migration's `auth.role() = 'service_role'` check; a direct
// anon call with p_payment_method = 'cod' is rejected at the database
// level even if someone skips this function entirely). Manual/Ganap orders
// are unaffected - Checkout.tsx still calls create_order_with_payment
// directly as anon for those, same as before.
//
// Secrets required (set with `supabase secrets set KEY=value`):
//   TURNSTILE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY
// SUPABASE_URL is provided automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';

const TURNSTILE_SECRET_KEY = Deno.env.get('TURNSTILE_SECRET_KEY') ?? '';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

async function verifyTurnstileToken(token: string, remoteIp: string | null): Promise<boolean> {
  const body = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) return false;

  const data = await res.json();
  return Boolean(data.success);
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (!TURNSTILE_SECRET_KEY) {
      console.error('submit-cod-order is missing TURNSTILE_SECRET_KEY');
      return jsonResponse({ error: 'Verification is not configured yet. Please contact us to complete your order.' }, 500);
    }

    const body = await req.json();
    const { captchaToken, ...orderFields } = body;

    if (!captchaToken || typeof captchaToken !== 'string') {
      return jsonResponse({ error: 'Verification challenge is required.' }, 400);
    }

    const remoteIp = req.headers.get('CF-Connecting-IP') ?? req.headers.get('x-forwarded-for');
    const verified = await verifyTurnstileToken(captchaToken, remoteIp);
    if (!verified) {
      return jsonResponse({ error: 'Verification failed. Please try again.' }, 400);
    }

    const { data, error } = await supabaseAdmin.rpc('create_order_with_payment', {
      p_customer_name: orderFields.customerName,
      p_email: orderFields.email,
      p_mobile: orderFields.mobile,
      p_address: orderFields.address,
      p_barangay: orderFields.barangay,
      p_city: orderFields.city,
      p_province: orderFields.province,
      p_postal_code: orderFields.postalCode,
      p_delivery_notes: orderFields.deliveryNotes ?? null,
      p_product: orderFields.product,
      p_quantity: orderFields.quantity,
      p_unit_price: orderFields.unitPrice,
      p_subtotal: orderFields.subtotal,
      p_delivery_fee: orderFields.deliveryFee,
      p_total: orderFields.total,
      p_payment_method: 'cod',
      p_payment_reference: null,
      p_payment_amount: null,
      p_payment_date: null,
      p_payment_proof_path: null,
      p_referral_code: orderFields.referralCode ?? null,
      p_discount_amount: orderFields.discountAmount ?? 0,
      p_applied_promotion_id: orderFields.appliedPromotionId ?? null,
    });

    if (error) {
      console.error('create_order_with_payment failed for COD order:', error);
      return jsonResponse({ error: error.message }, 500);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return jsonResponse({ error: 'Order was not created.' }, 500);
    }

    return jsonResponse({
      orderId: row.order_id,
      orderNo: row.order_no,
      orderStatus: row.order_status,
      paymentId: row.payment_id,
      paymentNo: row.payment_no,
      paymentStatus: row.payment_status,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
