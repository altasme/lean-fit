/**
 * Email subjects + bodies (Resend). Consumed by the Supabase Edge Function
 * in supabase/functions/send-order-email - keep server + client copy in sync
 * by treating this file as the single source, mirrored server-side.
 * See CLAUDE.md §10.
 *
 * Keyed by event rather than order/payment status directly, since a single
 * status can be reached two ways with different copy (e.g. order `pending`
 * covers both "just submitted, manual" and "rejected, needs correction" -
 * those need different emails even though neither maps to a distinct
 * status on its own).
 *
 * Fully branded (dark/gold, Lean & Fit wordmark header, "Track My Order"
 * CTA) via supabase/functions/_shared/emailTemplate.ts server-side - `body`
 * here is just the plain-text copy inside that branded wrapper, not the
 * final rendered HTML.
 */

export type OrderEmailEvent =
  | 'order_submitted' // manual method, awaiting payment verification
  | 'order_confirmed_cod' // COD, no verification gate
  | 'payment_approved'
  | 'payment_rejected'
  | 'packing'
  | 'shipped';

export type EmailTemplate = {
  subject: (orderNo: string) => string;
  heading: string;
  body: (vars: Record<string, string>) => string;
};

export const CUSTOMER_EMAILS: Record<OrderEmailEvent, EmailTemplate> = {
  order_submitted: {
    subject: (orderNo) => `Lean & Fit Order Received - #${orderNo}`,
    heading: 'ORDER RECEIVED',
    body: (v) =>
      `Hi ${v.customerName}, thanks for your order! We've received your order and payment details and our team is verifying your payment now. We'll email you as soon as it's confirmed.`,
  },
  order_confirmed_cod: {
    subject: () => 'Your Lean & Fit COD Order Is Confirmed',
    heading: 'ORDER CONFIRMED',
    body: (v) =>
      `Hi ${v.customerName}, order #${v.orderNo} is confirmed for Cash on Delivery. Please have ${v.total} ready when your order arrives.`,
  },
  payment_approved: {
    subject: () => 'Your Lean & Fit Payment Has Been Verified',
    heading: 'PAYMENT VERIFIED',
    body: (v) =>
      `Hi ${v.customerName}, your payment has been verified. We'll pack your order shortly and get it ready for delivery 📦`,
  },
  payment_rejected: {
    subject: () => 'Action Required - Lean & Fit Payment Verification',
    heading: 'ACTION REQUIRED',
    body: (v) =>
      `Hi ${v.customerName}, we couldn't verify the payment details submitted for order #${v.orderNo}. Please reply to this email or resubmit your proof of payment so we can continue processing your order.`,
  },
  packing: {
    subject: () => 'Your Lean & Fit Order Is Being Packed',
    heading: 'PACKING YOUR ORDER',
    body: (v) => `Hi ${v.customerName}, your order is now being packed! We'll notify you the moment it ships.`,
  },
  shipped: {
    subject: () => 'Your Lean & Fit Order Has Shipped',
    heading: 'ORDER SHIPPED',
    body: (v) => `Hi ${v.customerName}, your order has been shipped out! Courier: ${v.courier}, Tracking number: ${v.trackingNumber}.`,
  },
};

export const BUSINESS_NEW_ORDER_EMAIL = {
  subject: (orderNo: string) => `New Order - #${orderNo}`,
  heading: 'NEW ORDER SUBMITTED',
};

/**
 * Partner-side email events, sent via supabase/functions/send-partner-email
 * (mirrors send-order-email's structure, kept as its own function since it
 * reads from `partners` rather than `orders`/`payments`). Just the one event
 * for now (Issue #1's confirmation email) - there's no automatic email on
 * partner approval/activation; portal credentials are only ever emailed as
 * an admin-triggered opt-in (grant-portal-access, "Also email these
 * credentials" checkbox), never automatically.
 */
export type PartnerEmailEvent = 'package_payment_submitted';

export const PARTNER_EMAILS: Record<PartnerEmailEvent, EmailTemplate> = {
  package_payment_submitted: {
    subject: () => 'Lean & Fit Partner Application - Payment Received',
    heading: 'PAYMENT RECEIVED',
    body: (v) =>
      `Hi ${v.fullName}, thanks for applying to become a Lean & Fit ${v.partnerTypeLabel} partner. We've received your package payment and our team is reviewing it now. Once it's verified, you'll get a separate email with your partner portal login details and referral code.`,
  },
};
