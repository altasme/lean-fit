import { QtyStepper } from '../ui/QtyStepper';
import { PRODUCT } from '../../content/product';
import { formatPHP } from '../../lib/format';
import { useCartStore } from '../../store/cart';

export function OrderSummary() {
  const quantity = useCartStore((s) => s.quantity);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const subtotal = useCartStore((s) => s.subtotal());
  const total = useCartStore((s) => s.total());

  return (
    <div className="rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8">
      <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Order Summary</h2>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-lf-white">
            {PRODUCT.name} - {PRODUCT.variant}
          </p>
          <p className="text-sm text-lf-cream/60">{formatPHP(PRODUCT.price)} / box</p>
        </div>
        <QtyStepper value={quantity} onChange={setQuantity} />
      </div>

      <dl className="tabular mt-6 space-y-2 border-t border-white/10 pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-lf-cream/70">Subtotal</dt>
          <dd className="text-lf-white">{formatPHP(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-lf-cream/70">Delivery Fee</dt>
          <dd className="text-lf-white">{formatPHP(PRODUCT.deliveryFee)}</dd>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-3 text-base">
          <dt className="font-kicker uppercase tracking-wide2 text-lf-cream/70">Total</dt>
          <dd className="font-display text-xl text-lf-gold">{formatPHP(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
