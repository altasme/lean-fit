import { formatPHP } from '../../../lib/format';
import { ORDER_STATUS_EMOJI, ORDER_STATUS_LABELS } from '../../../types/order';
import { PAYMENT_STATUS_EMOJI, PAYMENT_STATUS_LABELS } from '../../../types/payment';
import type { PartnerOrder } from '../../../lib/partnerOrders';

// Spec §42 "My Orders" - orders personally placed by this partner
// (matched by their account email). Shown at whatever price was actually
// charged - checkout doesn't yet apply a partner's tier discount to their
// own purchases (there's no "buy at my price" flow, only the one-time
// package purchase from application), so this is retail/promo pricing,
// not the spec example's "Partner price" column. Noted inline rather than
// silently mislabeling it.
export function MyOrdersTab({ orders }: { orders: PartnerOrder[] }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-lf-cream/50">
        Orders placed under your account email. Partner tier pricing isn't applied to self-checkout
        yet - these show the price actually charged.
      </p>

      {orders.length === 0 ? (
        <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
          <p className="text-sm text-lf-cream/60">You haven't placed any orders yet.</p>
        </section>
      ) : (
        <section className="overflow-x-auto rounded-sm border border-white/10 bg-lf-charcoal">
          <table className="tabular w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide2 text-lf-cream/50">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Order Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-lf-white">{order.order_no}</td>
                  <td className="px-4 py-3 text-lf-cream/60">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-lf-cream/80">
                    {order.product} × {order.quantity}
                  </td>
                  <td className="px-4 py-3 text-lf-white">{formatPHP(order.total)}</td>
                  <td className="px-4 py-3">
                    {order.payment
                      ? `${PAYMENT_STATUS_EMOJI[order.payment.status]} ${PAYMENT_STATUS_LABELS[order.payment.status]}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-lf-cream/60">
                    {ORDER_STATUS_EMOJI[order.status]} {ORDER_STATUS_LABELS[order.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
