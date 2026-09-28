// Supabase Edge Function - sends customer + business order emails via Resend.
//
// Invoked by:
//  - the client, right after a successful checkout (`event: "order_submitted"` /
//    `"order_confirmed_cod"`)
//  - the admin dashboard, right after a status change (`event: "payment_approved"` /
//    `"payment_rejected"` / `"packing"` / `"shipped"`)
//  - the ganap-webhook/ganap-check-status Edge Functions, once a Ganap
//    gateway payment settles (`event: "payment_approved"`)
//
// Secrets required (set with `supabase secrets set KEY=value`):
//   RESEND_API_KEY, BUSINESS_NOTIFICATION_EMAIL, SUPABASE_SERVICE_ROLE_KEY
// SUPABASE_URL is provided automatically in the Edge Function runtime.
// SITE_URL (optional, defaults to https://leanandfit.ph) - used to link
// the customer "Track My Order" CTA and the business "View In Admin" CTA
// to the right domain/subdomain.
//
// See CLAUDE.md §10 for the subject/event mapping this mirrors from
// src/content/emails.ts (kept in sync manually - see note there). Order and
// payment now live in separate tables (CLAUDE.md §6/§11), so this function
// joins both by order_id rather than reading payment fields off `orders`.
//
// Branded via _shared/emailTemplate.ts (client request: "these templates
// must be fully branded with the Lean & Fit brand") - every email here used
// to be a bare, unstyled `<p>...</p>` string with no logo/colors at all.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { renderBrandedEmail, renderInfoBox } from '../_shared/emailTemplate.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const BUSINESS_EMAIL = Deno.env.get('BUSINESS_NOTIFICATION_EMAIL') ?? '';
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'Lean & Fit <no-reply@leanandfit.ph>';
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://leanandfit.ph').replace(/\/+$/, '');
const BARE_HOST = SITE_URL.replace(/^https?:\/\//, '');
const TRACK_ORDER_URL = `${SITE_URL}/track-order`;

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

type OrderEmailEvent =
  | 'order_submitted'
  | 'order_confirmed_cod'
  | 'payment_approved'
  | 'payment_rejected'
  | 'packing'
  | 'shipped';

const ORDER_EMAIL_CONFIG: Record<
  OrderEmailEvent,
  {
    subject: (orderNo: string) => string;
    heading: string;
    body: (order: Record<string, unknown>) => string;
    infoRows: (order: Record<string, unknown>) => { label: string; value: string }[];
  }
> = {
  order_submitted: {
    subject: (orderNo) => `Lean & Fit Order Received - #${orderNo}`,
    heading: 'Order Received',
    body: (o) =>
      `Hi ${o.customer_name}, thanks for your order! We've received your order and payment details and our team is verifying your payment now. We'll email you as soon as it's confirmed.`,
    infoRows: (o) => [
      { label: 'Order Number', value: String(o.order_no) },
      { label: 'Total', value: `₱${o.total}` },
    ],
  },
  order_confirmed_cod: {
    subject: () => 'Your Lean & Fit COD Order Is Confirmed',
    heading: 'Order Confirmed',
    body: (o) =>
      `Hi ${o.customer_name}, your order is confirmed for Cash on Delivery. Please have your total ready when it arrives.`,
    infoRows: (o) => [
      { label: 'Order Number', value: String(o.order_no) },
      { label: 'Total Due (COD)', value: `₱${o.total}` },
    ],
  },
  payment_approved: {
    subject: () => 'Your Lean & Fit Payment Has Been Verified',
    heading: 'Payment Verified',
    body: (o) =>
      `Hi ${o.customer_name}, your payment has been verified. We'll pack your order shortly and get it ready for delivery 📦`,
    infoRows: (o) => [{ label: 'Order Number', value: String(o.order_no) }],
  },
  payment_rejected: {
    subject: () => 'Action Required - Lean & Fit Payment Verification',
    heading: 'Action Required',
    body: (o) =>
      `Hi ${o.customer_name}, we couldn't verify the payment details submitted for this order. Please reply to this email or resubmit your proof of payment so we can continue processing it.`,
    infoRows: (o) => [{ label: 'Order Number', value: String(o.order_no) }],
  },
  packing: {
    subject: () => 'Your Lean & Fit Order Is Being Packed',
    heading: 'Packing Your Order',
    body: (o) => `Hi ${o.customer_name}, your order is now being packed! We'll notify you the moment it ships.`,
    infoRows: (o) => [{ label: 'Order Number', value: String(o.order_no) }],
  },
  shipped: {
    subject: () => 'Your Lean & Fit Order Has Shipped',
    heading: 'Order Shipped',
    body: (o) => `Hi ${o.customer_name}, your order has been shipped out!`,
    infoRows: (o) => [
      { label: 'Order Number', value: String(o.order_no) },
      { label: 'Courier', value: String(o.courier ?? 'TBD') },
      { label: 'Tracking Number', value: String(o.tracking_number ?? 'TBD') },
    ],
  },
};

function renderCustomerEmail(event: OrderEmailEvent, order: Record<string, unknown>): string {
  const cfg = ORDER_EMAIL_CONFIG[event];
  const bodyHtml = `<p style="margin:0 0 4px;">${cfg.body(order)}</p>${renderInfoBox(cfg.infoRows(order))}`;
  return renderBrandedEmail({
    heading: cfg.heading,
    bodyHtml,
    ctaLabel: 'Track My Order',
    ctaUrl: TRACK_ORDER_URL,
  });
}

function renderBusinessNotification(order: Record<string, unknown>, payment: Record<string, unknown> | null): string {
  const bodyHtml =
    `<p style="margin:0 0 4px;">A new order was just submitted on the website.</p>` +
    renderInfoBox([
      { label: 'Order Number', value: String(order.order_no) },
      { label: 'Customer', value: String(order.customer_name) },
      { label: 'Email', value: String(order.email) },
      { label: 'Mobile', value: String(order.mobile) },
      { label: 'Product', value: `${order.product} × ${order.quantity}` },
      { label: 'Total', value: `₱${order.total}` },
      { label: 'Payment Method', value: String(payment?.method ?? 'n/a') },
      { label: 'Reference', value: String(payment?.reference ?? 'n/a') },
    ]);
  return renderBrandedEmail({
    heading: 'New Order Submitted',
    bodyHtml,
    ctaLabel: 'View In Admin',
    ctaUrl: `https://admin.${BARE_HOST}/admin/orders/${order.id}`,
  });
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
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const { orderId, event: rawEvent, isNewOrder } = await req.json();
    if (!orderId || !rawEvent) {
      return jsonResponse({ error: 'orderId and event are required' }, 400);
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    const event = rawEvent as OrderEmailEvent;
    const cfg = ORDER_EMAIL_CONFIG[event];

    if (cfg) {
      await sendResendEmail(order.email, cfg.subject(order.order_no), renderCustomerEmail(event, order));
    }

    if (isNewOrder && BUSINESS_EMAIL) {
      await sendResendEmail(
        BUSINESS_EMAIL,
        `New Order - #${order.order_no}`,
        renderBusinessNotification(order, payment ?? null),
      );
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
