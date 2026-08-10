// Supabase Edge Function - sends customer + business order emails via Resend.
//
// Invoked by:
//  - the client, right after a successful checkout (`event: "submitted"`)
//  - the admin dashboard, right after a status change (`event: "<new status>"`)
//
// Secrets required (set with `supabase secrets set KEY=value`):
//   RESEND_API_KEY, BUSINESS_NOTIFICATION_EMAIL, SUPABASE_SERVICE_ROLE_KEY
// SUPABASE_URL is provided automatically in the Edge Function runtime.
//
// See CLAUDE.md §10 for the subject/status mapping this mirrors from
// src/content/emails.ts (kept in sync manually - see note there).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const BUSINESS_EMAIL = Deno.env.get('BUSINESS_NOTIFICATION_EMAIL') ?? '';
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'Lean & Fit <orders@leanfitcoffee.com>';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

type OrderStatus =
  | 'pending_payment'
  | 'payment_verification'
  | 'payment_approved'
  | 'packing'
  | 'shipped'
  | 'completed'
  | 'payment_rejected';

const CUSTOMER_SUBJECTS: Partial<Record<OrderStatus, (orderNo: string) => string>> = {
  payment_verification: (orderNo) => `Lean & Fit Order Received - #${orderNo}`,
  payment_approved: () => 'Your Lean & Fit Payment Has Been Verified',
  packing: () => 'Your Lean & Fit Order Is Being Packed',
  shipped: () => 'Your Lean & Fit Order Has Shipped',
  payment_rejected: () => 'Action Required - Lean & Fit Payment Verification',
};

function renderCustomerBody(status: OrderStatus, order: Record<string, unknown>): string {
  const name = order.customer_name as string;
  const orderNo = order.order_no as string;

  switch (status) {
    case 'payment_verification':
      return `<p>Hi ${name},</p><p>Thanks for your order. We've received your order and payment details for <strong>#${orderNo}</strong> and our team is verifying your payment now. We'll email you as soon as it's confirmed.</p>`;
    case 'payment_approved':
      return `<p>Hi ${name},</p><p>Your payment for order <strong>#${orderNo}</strong> has been verified. We're getting your Lean & Fit Protein Coffee ready.</p>`;
    case 'packing':
      return `<p>Hi ${name},</p><p>Order <strong>#${orderNo}</strong> is being packed and will ship soon.</p>`;
    case 'shipped':
      return `<p>Hi ${name},</p><p>Order <strong>#${orderNo}</strong> is on its way via ${order.courier ?? 'our courier'} - tracking number ${order.tracking_number ?? 'TBD'}.</p>`;
    case 'payment_rejected':
      return `<p>Hi ${name},</p><p>We couldn't verify the payment details submitted for order <strong>#${orderNo}</strong>. Please reply to this email or resubmit your proof of payment so we can continue processing your order.</p>`;
    default:
      return `<p>Hi ${name}, there's an update on your order #${orderNo}.</p>`;
  }
}

async function sendResendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - skipping email send.', { to, subject });
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error (${res.status}): ${text}`);
  }
}

Deno.serve(async (req) => {
  try {
    const { orderId, status: rawStatus, isNewOrder } = await req.json();
    if (!orderId || !rawStatus) {
      return new Response(JSON.stringify({ error: 'orderId and status are required' }), {
        status: 400,
      });
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    const status = rawStatus as OrderStatus;
    const subjectFn = CUSTOMER_SUBJECTS[status];

    if (subjectFn) {
      await sendResendEmail(order.email, subjectFn(order.order_no), renderCustomerBody(status, order));
    }

    if (isNewOrder && BUSINESS_EMAIL) {
      await sendResendEmail(
        BUSINESS_EMAIL,
        `New Order - #${order.order_no}`,
        `<p>New order <strong>#${order.order_no}</strong> from ${order.customer_name} (${order.email}, ${order.mobile}).</p>
         <p>Product: ${order.product} × ${order.quantity}<br/>Total: ₱${order.total}</p>
         <p>Payment method: ${order.payment_method} - ref ${order.payment_reference ?? 'n/a'}</p>`,
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
