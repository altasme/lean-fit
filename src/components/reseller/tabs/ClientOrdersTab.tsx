import { formatPHP } from '../../../lib/format';
import { ORDER_STATUS_EMOJI, ORDER_STATUS_LABELS } from '../../../types/order';
import { PAYMENT_STATUS_EMOJI, PAYMENT_STATUS_LABELS } from '../../../types/payment';
import type { PartnerOrder } from '../../../lib/partnerOrders';

// Spec §41 "Client Orders" - orders generated through this partner's
// referral link. No ACCEPT/MARK AS FULFILLED actions here (spec's
// example) - there's no partner-run fulfillment path built yet (Phase E's
// note: every order is still fulfilled by Lean & Fit admin), so this is
// read-only status visibility, not an action queue.
export function ClientOrdersTab({ orders }: { orders: PartnerOrder[] }) {
  if (orders.length === 0) {
    return (
      <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
        <p className="text-sm text-lf-cream/60">
          No orders yet from customers who used your referral link.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-x-auto rounded-sm border border-white/10 bg-lf-charcoal">
      <table className="tabular w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide2 text-lf-cream/50">
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Fulfillment</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-white/5 last:border-0">
              <td className="px-4 py-3 text-lf-white">{order.order_no}</td>
              <td className="px-4 py-3 text-lf-cream/80">{order.customer_name}</td>
              <td className="px-4 py-3 text-lf-cream/80">
                {order.product} × {order.quantity}
              </td>
              <td className="px-4 py-3 text-lf-white">{formatPHP(order.total)}</td>
              <td className="px-4 py-3 text-lf-cream/60">
                {new Date(order.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {order.payment
                  ? `${PAYMENT_STATUS_EMOJI[order.payment.status]} ${PAYMENT_STATUS_LABELS[order.payment.status]}`
                  : '—'}
              </td>
              <td className="px-4 py-3">
                <span className="text-lf-cream/60">
                  {ORDER_STATUS_EMOJI[order.status]} {ORDER_STATUS_LABELS[order.status]}
                </span>
                <span className="block text-xs text-lf-cream/40">Fulfilled by Lean &amp; Fit</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
