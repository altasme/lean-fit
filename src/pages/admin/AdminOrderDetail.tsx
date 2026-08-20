import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusControls } from '../../components/admin/StatusControls';
import {
  getOrder,
  getOrderHistory,
  getPayment,
  getPaymentHistory,
  getProofSignedUrl,
} from '../../lib/adminOrders';
import { getPartner } from '../../lib/adminPartners';
import { formatPHP } from '../../lib/format';
import { FULFILLMENT_METHOD_LABELS, ORDER_STATUS_EMOJI, ORDER_STATUS_LABELS } from '../../types/order';
import type { Order, OrderStatusHistory } from '../../types/order';
import { PAYMENT_STATUS_EMOJI, PAYMENT_STATUS_LABELS } from '../../types/payment';
import type { Payment, PaymentStatusHistory } from '../../types/payment';
import { PARTNER_TYPE_LABELS } from '../../types/partner';
import type { Partner } from '../../types/partner';

const METHOD_LABELS: Record<string, string> = {
  gcash: 'GCash',
  maya: 'Maya',
  bank_transfer: 'Bank Transfer',
  cod: 'Cash on Delivery',
};

const PROVIDER_LABELS: Record<string, string> = {
  manual: 'Manual',
  cod: 'COD',
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderStatusHistory[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentStatusHistory[]>([]);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [referralPartner, setReferralPartner] = useState<Partner | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [o, p, oh] = await Promise.all([getOrder(id), getPayment(id), getOrderHistory(id)]);
      setOrder(o);
      setPayment(p);
      setOrderHistory(oh);
      if (p) {
        setPaymentHistory(await getPaymentHistory(p.id));
        if (p.proof_path) setProofUrl(await getProofSignedUrl(p.proof_path));
      }
      setReferralPartner(o.referral_partner_id ? await getPartner(o.referral_partner_id) : null);
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
          {ORDER_STATUS_EMOJI[order.status]} {ORDER_STATUS_LABELS[order.status]}
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
            <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Product</h2>
            <dl className="tabular mt-3 space-y-1.5 text-sm">
              <Row label="Product" value={`${order.product} × ${order.quantity}`} />
              <Row label="Unit Price" value={formatPHP(order.unit_price)} />
              {order.discount_amount > 0 && (
                <Row label="Discount Applied" value={`-${formatPHP(order.discount_amount)}`} />
              )}
              <Row label="Subtotal" value={formatPHP(order.subtotal)} />
              <Row label="Delivery Fee" value={formatPHP(order.delivery_fee)} />
              <Row label="Total" value={formatPHP(order.total)} />
              <Row label="Fulfillment" value={FULFILLMENT_METHOD_LABELS[order.fulfillment_method]} />
              {order.courier && <Row label="Courier" value={order.courier} />}
              {order.tracking_number && <Row label="Tracking" value={order.tracking_number} />}
            </dl>
          </section>

          {order.referral_partner_id && (
            <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
              <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
                Referral Attribution
              </h2>
              <dl className="tabular mt-3 space-y-1.5 text-sm">
                <Row
                  label="Partner"
                  value={referralPartner ? referralPartner.full_name : 'Loading…'}
                />
                {order.referral_partner_type && (
                  <Row label="Type" value={PARTNER_TYPE_LABELS[order.referral_partner_type]} />
                )}
                <Row label="Referral Code" value={order.ref_code ?? '—'} />
                {order.partner_price != null && (
                  <Row label="Partner Price" value={formatPHP(order.partner_price)} />
                )}
                {order.partner_earnings != null && (
                  <Row label="Partner Earnings" value={formatPHP(order.partner_earnings)} />
                )}
              </dl>
            </section>
          )}

          {/* Unified payment panel - identical layout regardless of provider, per CLAUDE.md §9. */}
          <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
            <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Payment</h2>
            {payment ? (
              <>
                <dl className="tabular mt-3 space-y-1.5 text-sm">
                  <Row label="Method" value={METHOD_LABELS[payment.method] ?? payment.method} />
                  <Row label="Provider" value={PROVIDER_LABELS[payment.provider] ?? payment.provider} />
                  <Row
                    label="Payment Status"
                    value={`${PAYMENT_STATUS_EMOJI[payment.status]} ${PAYMENT_STATUS_LABELS[payment.status]}`}
                  />
                  <Row label="Amount" value={formatPHP(payment.amount)} />
                  {payment.reference && <Row label="Reference" value={payment.reference} />}
                  {payment.payment_date && <Row label="Payment Date" value={payment.payment_date} />}
                  {payment.verified_at && (
                    <Row label="Verified At" value={new Date(payment.verified_at).toLocaleString('en-PH')} />
                  )}
                </dl>

                {payment.provider === 'manual' &&
                  (proofUrl ? (
                    <a href={proofUrl} target="_blank" rel="noreferrer" className="mt-4 block">
                      <img
                        src={proofUrl}
                        alt="Payment proof"
                        className="max-h-64 rounded-sm border border-white/10"
                      />
                    </a>
                  ) : (
                    <p className="mt-4 text-xs text-lf-cream/50">No proof of payment on file.</p>
                  ))}
              </>
            ) : (
              <p className="mt-3 text-sm text-lf-cream/50">No payment record found.</p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <StatusControls order={order} payment={payment} onUpdated={load} />

          <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
            <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
              Order Status History
            </h2>
            <ol className="mt-3 space-y-3 text-sm">
              {orderHistory.map((h) => (
                <li key={h.id} className="border-l-2 border-lf-gold/40 pl-3">
                  <p className="text-lf-white">
                    {ORDER_STATUS_EMOJI[h.status]} {ORDER_STATUS_LABELS[h.status]}
                  </p>
                  <p className="text-xs text-lf-cream/50">
                    {new Date(h.created_at).toLocaleString('en-PH')}
                    {h.note ? ` - ${h.note}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
            <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
              Payment Status History
            </h2>
            <ol className="mt-3 space-y-3 text-sm">
              {paymentHistory.length === 0 && (
                <li className="text-xs text-lf-cream/50">No payment history yet.</li>
              )}
              {paymentHistory.map((h) => (
                <li key={h.id} className="border-l-2 border-lf-gold/40 pl-3">
                  <p className="text-lf-white">
                    {PAYMENT_STATUS_EMOJI[h.status]} {PAYMENT_STATUS_LABELS[h.status]}
                  </p>
                  <p className="text-xs text-lf-cream/50">
                    {new Date(h.created_at).toLocaleString('en-PH')}
                    {h.note ? ` - ${h.note}` : ''}
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
