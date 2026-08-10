/**
 * Email subjects + bodies (Resend). Consumed by the Supabase Edge Function
 * in supabase/functions/send-order-email - keep server + client copy in sync
 * by treating this file as the single source, mirrored server-side.
 * See CLAUDE.md §10.
 */

import type { OrderStatus } from '../types/order';

export type EmailTemplate = {
  subject: (orderNo: string) => string;
  heading: string;
  body: (vars: Record<string, string>) => string;
};

export const CUSTOMER_EMAILS: Partial<Record<OrderStatus, EmailTemplate>> = {
  payment_verification: {
    subject: (orderNo) => `Lean & Fit Order Received - #${orderNo}`,
    heading: 'ORDER RECEIVED',
    body: (v) =>
      `Hi ${v.customerName}, thanks for your order. We've received your order and payment details for #${v.orderNo} and our team is verifying your payment now. We'll email you as soon as it's confirmed.`,
  },
  payment_approved: {
    subject: () => 'Your Lean & Fit Payment Has Been Verified',
    heading: 'PAYMENT VERIFIED',
    body: (v) =>
      `Hi ${v.customerName}, your payment for order #${v.orderNo} has been verified. We're getting your Lean & Fit Protein Coffee ready.`,
  },
  packing: {
    subject: () => 'Your Lean & Fit Order Is Being Packed',
    heading: 'PACKING YOUR ORDER',
    body: (v) => `Hi ${v.customerName}, order #${v.orderNo} is being packed and will ship soon.`,
  },
  shipped: {
    subject: () => 'Your Lean & Fit Order Has Shipped',
    heading: 'ORDER SHIPPED',
    body: (v) =>
      `Hi ${v.customerName}, order #${v.orderNo} is on its way via ${v.courier} - tracking number ${v.trackingNumber}.`,
  },
  payment_rejected: {
    subject: () => 'Action Required - Lean & Fit Payment Verification',
    heading: 'ACTION REQUIRED',
    body: (v) =>
      `Hi ${v.customerName}, we couldn't verify the payment details submitted for order #${v.orderNo}. Please reply to this email or resubmit your proof of payment so we can continue processing your order.`,
  },
};

export const BUSINESS_NEW_ORDER_EMAIL = {
  subject: (orderNo: string) => `New Order - #${orderNo}`,
  heading: 'NEW ORDER SUBMITTED',
};
