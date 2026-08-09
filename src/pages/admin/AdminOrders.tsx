import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { listOrders } from '../../lib/adminOrders';
import { formatPHP } from '../../lib/format';
import { STATUS_EMOJI, STATUS_LABELS } from '../../types/order';
import type { Order } from '../../types/order';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
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
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-lf-charcoal text-xs uppercase tracking-wide2 text-lf-cream/60">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link to={`/admin/orders/${order.id}`} className="text-lf-gold hover:underline">
                      {order.order_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-lf-white">{order.customer_name}</td>
                  <td className="px-4 py-3 text-lf-white">{formatPHP(order.total)}</td>
                  <td className="px-4 py-3 text-lf-cream/70">{order.payment_method}</td>
                  <td className="px-4 py-3">
                    <span className="whitespace-nowrap">
                      {STATUS_EMOJI[order.status]} {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-lf-cream/60">
                    {new Date(order.created_at).toLocaleDateString('en-PH')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
