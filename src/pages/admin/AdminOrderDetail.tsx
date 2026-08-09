import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusControls } from '../../components/admin/StatusControls';
import { getOrder, getOrderHistory, getProofSignedUrl } from '../../lib/adminOrders';
import { formatPHP } from '../../lib/format';
import { STATUS_EMOJI, STATUS_LABELS } from '../../types/order';
import type { Order, OrderStatusHistory } from '../../types/order';

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<OrderStatusHistory[]>([]);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [o, h] = await Promise.all([getOrder(id), getOrderHistory(id)]);
      setOrder(o);
      setHistory(h);
      if (o.payment_proof_path) {
        setProofUrl(await getProofSignedUrl(o.payment_proof_path));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order.');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <AdminLayout>
        <p className="text-sm text-lf-error">{error}</p>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <p className="text-sm text-lf-cream/60">Loading order…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Link to="/admin" className="text-sm text-lf-gold hover:underline">
        ← Back to orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">
          {order.order_no}
        </h1>
        <span className="rounded-full border border-white/10 bg-lf-charcoal px-4 py-1.5 text-sm">
          {STATUS_EMOJI[order.status]} {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
            <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Customer</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Name" value={order.customer_name} />
              <Row label="Email" value={order.email} />
              <Row label="Mobile" value={order.mobile} />
              <Row
                label="Address"
                value={`${order.address}, ${order.barangay}, ${order.city}, ${order.province} ${order.postal_code}`}
              />
              {order.delivery_notes && <Row label="Notes" value={order.delivery_notes} />}
            </dl>
          </section>

          <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
            <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
              Product &amp; Payment
            </h2>
            <dl className="tabular mt-3 space-y-1.5 text-sm">
              <Row label="Product" value={`${order.product} × ${order.quantity}`} />
              <Row label="Unit Price" value={formatPHP(order.unit_price)} />
              <Row label="Subtotal" value={formatPHP(order.subtotal)} />
              <Row label="Delivery Fee" value={formatPHP(order.delivery_fee)} />
              <Row label="Total" value={formatPHP(order.total)} />
              <Row label="Payment Method" value={order.payment_method} />
              <Row label="Reference" value={order.payment_reference ?? '—'} />
              <Row label="Amount Paid" value={order.payment_amount ? formatPHP(order.payment_amount) : '—'} />
              <Row label="Payment Date" value={order.payment_date ?? '—'} />
              {order.courier && <Row label="Courier" value={order.courier} />}
              {order.tracking_number && <Row label="Tracking" value={order.tracking_number} />}
            </dl>

            {proofUrl ? (
              <a href={proofUrl} target="_blank" rel="noreferrer" className="mt-4 block">
                <img src={proofUrl} alt="Payment proof" className="max-h-64 rounded-sm border border-white/10" />
              </a>
            ) : (
              <p className="mt-4 text-xs text-lf-cream/50">No proof of payment on file.</p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <StatusControls order={order} onUpdated={load} />

          <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
            <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
              Status History
            </h2>
            <ol className="mt-3 space-y-3 text-sm">
              {history.map((h) => (
                <li key={h.id} className="border-l-2 border-lf-gold/40 pl-3">
                  <p className="text-lf-white">
                    {STATUS_EMOJI[h.status]} {STATUS_LABELS[h.status]}
                  </p>
                  <p className="text-xs text-lf-cream/50">
                    {new Date(h.created_at).toLocaleString('en-PH')}
                    {h.note ? ` — ${h.note}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-lf-cream/60">{label}</dt>
      <dd className="text-right text-lf-white">{value}</dd>
    </div>
  );
}
