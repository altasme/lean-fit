import { useEffect, useState } from 'react';
import { formatPHP } from '../../../lib/format';
import { ORDER_STATUS_EMOJI, ORDER_STATUS_LABELS } from '../../../types/order';
import { PAYMENT_STATUS_EMOJI, PAYMENT_STATUS_LABELS } from '../../../types/payment';
import type { PartnerOrder } from '../../../lib/partnerOrders';
import { createPartnerOwnOrder } from '../../../lib/partnerOrders';
import { fetchPartnerOwnPricing } from '../../../lib/partners';
import type { PartnerOwnPricing } from '../../../lib/partners';
import { startGanapCheckout } from '../../../lib/ganap';
import { PARTNER_ORDER_MOQ, PARTNER_TYPE_LABELS } from '../../../types/partner';
import type { Partner } from '../../../types/partner';

// Spec §42 "My Orders" - orders personally placed by this partner (matched
// by their account email). Client request: "clients should be able to
// order for themselves inside the partner portal... at a price that's
// already discounted according to how much their % off is" - the Order
// For Yourself panel below (migration 0029's partner_create_order()) is
// that flow. Orders placed through it show up in this same list
// automatically, since they're created with the partner's own registered
// email - no separate view needed.
export function MyOrdersTab({
  orders,
  partner,
  onOrderPlaced,
}: {
  orders: PartnerOrder[];
  partner: Partner;
  onOrderPlaced: () => void;
}) {
  return (
    <div className="space-y-6">
      <OrderNowPanel partner={partner} onOrderPlaced={onOrderPlaced} />

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

function OrderNowPanel({ partner, onOrderPlaced }: { partner: Partner; onOrderPlaced: () => void }) {
  const [open, setOpen] = useState(false);
  const [pricing, setPricing] = useState<PartnerOwnPricing | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(() =>
    partner.partner_type ? PARTNER_ORDER_MOQ[partner.partner_type] : 1,
  );
  const [quantityError, setQuantityError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || pricing !== undefined || !partner.partner_type) return;
    fetchPartnerOwnPricing(partner.partner_type)
      .then(setPricing)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load pricing.'));
  }, [open, pricing, partner.partner_type]);

  // A partner with no type set can't be priced (self-ordering needs a tier
  // discount) - shouldn't happen in practice (only active partners, which
  // always have a type, reach My Orders), but the field is nullable on the
  // Partner type, so guard rather than assume.
  if (!partner.partner_type) return null;

  // Client request: "Implement MOQ in the self ordering in the partner
  // portal. Reseller MOQ 5, Distributor MOQ 15." Enforced server-side too
  // (migration 0031) - this is the form-side mirror/hint.
  const moq = PARTNER_ORDER_MOQ[partner.partner_type];

  // Client request: "update the payment method in the partner portal" ->
  // switch off manual GCash/Maya/Bank Transfer proof-upload onto the same
  // Ganap gateway retail checkout uses. The order is created first
  // (server-priced, pending), then the browser leaves for Ganap's hosted
  // checkout page - same two-step shape as Checkout.tsx's retail flow.
  // onOrderPlaced() runs before the redirect so the new pending order is
  // already in "My Orders" if the partner comes back without finishing.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pricing) return;

    if (quantity < moq) {
      setQuantityError(`Minimum order is ${moq} boxes for ${PARTNER_TYPE_LABELS[partner.partner_type!]} partners.`);
      return;
    }
    setQuantityError(null);

    setSubmitting(true);
    setSubmitError(null);
    try {
      const order = await createPartnerOwnOrder({ quantity });
      onOrderPlaced();
      const { redirectUrl } = await startGanapCheckout(order.orderId, order.paymentId, 'partner');
      window.location.href = redirectUrl;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-white/10 bg-lf-charcoal p-6">
        <div>
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Order For Yourself</h2>
          <p className="mt-1 text-xs text-lf-cream/60">
            Restock at your {PARTNER_TYPE_LABELS[partner.partner_type]} partner price. Minimum order:{' '}
            {moq} {moq === 1 ? 'box' : 'boxes'}.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="btn-gold !px-5 !py-2.5 !text-sm">
          Order Now
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Order For Yourself</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-lf-cream/50 hover:text-lf-cream">
          Cancel
        </button>
      </div>

      {loadError && <p className="mt-4 text-sm text-lf-error">{loadError}</p>}
      {pricing === undefined && !loadError && (
        <p className="mt-4 text-sm text-lf-cream/60">Loading your partner price…</p>
      )}
      {pricing === null && !loadError && (
        <p className="mt-4 text-sm text-lf-cream/60">No product is available to order right now.</p>
      )}

      {pricing && (
        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-6">
          <div className="rounded-sm border border-white/10 bg-lf-black p-5">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-lf-cream/70" htmlFor="own-order-qty">
                {pricing.productName}
              </label>
              <input
                id="own-order-qty"
                type="number"
                min={moq}
                value={quantity}
                onChange={(e) => {
                  setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)));
                  setQuantityError(null);
                }}
                className="w-20 rounded-sm border border-white/15 bg-lf-charcoal px-3 py-1.5 text-right text-sm text-lf-white focus:border-lf-gold focus:outline-none"
              />
            </div>
            <p className="mt-2 text-xs text-lf-cream/50">
              Minimum order: {moq} {moq === 1 ? 'box' : 'boxes'}.
            </p>
            {quantityError && <p className="mt-1.5 text-xs text-lf-error">{quantityError}</p>}
            <dl className="tabular mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-lf-cream/60">Your Price / Box</dt>
                <dd className="text-lf-white">{formatPHP(pricing.unitPrice)}</dd>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1.5 text-base">
                <dt className="text-lf-cream/80">Total</dt>
                <dd className="text-lf-gold">{formatPHP(Math.round(pricing.unitPrice * quantity * 100) / 100)}</dd>
              </div>
            </dl>
          </div>

          <p className="text-xs text-lf-cream/60">
            You'll be redirected to a secure payment page to pay via GCash, Maya, or online banking
            (QR Ph). Your order is confirmed automatically once payment clears - no proof of payment
            needed.
          </p>

          {submitError && (
            <p className="rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
              {submitError}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-50">
            {submitting ? 'Redirecting…' : 'Proceed To Payment'}
          </button>
        </form>
      )}
    </section>
  );
}
