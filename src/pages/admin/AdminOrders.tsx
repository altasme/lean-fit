import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { listOrders } from '../../lib/adminOrders';
import type { OrderWithPayment } from '../../lib/adminOrders';
import { formatPHP } from '../../lib/format';
import { ORDER_STATUS_EMOJI, ORDER_STATUS_LABELS } from '../../types/order';
import { PAYMENT_STATUS_EMOJI, PAYMENT_STATUS_LABELS } from '../../types/payment';

const METHOD_LABELS: Record<string, string> = {
  gcash: 'GCash',
  maya: 'Maya',
  bank_transfer: 'Bank Transfer',
  cod: 'COD',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderWithPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AdminLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Orders</h1>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}
      {!orders && !error && <p className="mt-4 text-sm text-lf-cream/60">Loading orders…</p>}
      {orders && orders.length === 0 && (
        <p className="mt-4 text-sm text-lf-cream/60">No orders yet.</p>
      )}

      {orders && orders.length > 0 && (
        <div className="tabular mt-6 overflow-x-auto rounded-sm border border-white/10">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-lf-charcoal text-xs uppercase tracking-wide2 text-lf-cream/60">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Payment Status</th>
                <th className="px-4 py-3">Order Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isCod = order.payment?.method === 'cod';
                return (
                  <tr
                    key={order.id}
                    className={`border-t border-white/5 hover:bg-white/5 ${isCod ? 'bg-lf-gold/5' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <Link to={`/admin/orders/${order.id}`} className="text-lf-gold hover:underline">
                        {order.order_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-lf-white">{order.customer_name}</td>
                    <td className="px-4 py-3 text-lf-white">{formatPHP(order.total)}</td>
                    <td className="px-4 py-3 text-lf-cream/70">
                      <span className="whitespace-nowrap">
                        {order.payment ? METHOD_LABELS[order.payment.method] : '—'}
                        {isCod && (
                          <span className="ml-1.5 rounded-full border border-lf-gold/40 px-1.5 py-0.5 text-[10px] text-lf-gold">
                            COD
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {order.payment ? (
                        <span className="whitespace-nowrap">
                          {PAYMENT_STATUS_EMOJI[order.payment.status]}{' '}
                          {PAYMENT_STATUS_LABELS[order.payment.status]}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="whitespace-nowrap">
                        {ORDER_STATUS_EMOJI[order.status]} {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-lf-cream/60">
                      {new Date(order.created_at).toLocaleDateString('en-PH')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
