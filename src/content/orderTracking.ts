import type { OrderStatus } from '../types/order';

/**
 * Customer-facing copy for the public Track My Order timeline
 * (src/pages/TrackOrder.tsx) - client-specified wording for confirmed/
 * packing/shipped; pending/completed/cancelled/returned are reasonable
 * defaults in the same voice, not separately specified by the client.
 * Shipped's courier/tracking line is appended in the component itself
 * (those are live values, not static copy).
 */
export const ORDER_TRACKING_MESSAGES: Record<OrderStatus, string> = {
  pending: "We've received your order and are verifying your payment. You'll be notified as soon as it's confirmed.",
  confirmed:
    "Your order has been confirmed and received! We'll pack it shortly and get it ready for delivery 📦",
  packing: 'Your order is now being packed!',
  shipped: 'Your order has been shipped out!',
  completed: 'Your order has been delivered. Thank you for choosing Lean & Fit!',
  cancelled: 'This order has been cancelled.',
  returned: 'This order was returned to sender.',
};

/** The normal fulfillment pipeline, in order - cancelled/returned are exceptions handled separately. */
export const ORDER_TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Order Placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'packing', label: 'Packing' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'completed', label: 'Completed' },
];
