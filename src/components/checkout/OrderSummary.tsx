import { useEffect, useState } from 'react';
import { QtyStepper } from '../ui/QtyStepper';
import { PRODUCT } from '../../content/product';
import { formatPHP } from '../../lib/format';
import { useCartStore } from '../../store/cart';
import { useActiveProduct } from '../../hooks/useActiveProduct';
import { applyDiscountCode } from '../../lib/pricing';

export function OrderSummary() {
  const quantity = useCartStore((s) => s.quantity);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const srp = useCartStore((s) => s.srp);
  const subtotal = useCartStore((s) => s.subtotal());
  const total = useCartStore((s) => s.total());
  const deliveryFee = useCartStore((s) => s.deliveryFee);
  const discountCode = useCartStore((s) => s.discountCode);
  const discountAmount = useCartStore((s) => s.discountAmount());
  const setDiscount = useCartStore((s) => s.setDiscount);
  const { product, price, loading, partnerPricing, promotions } = useActiveProduct();

  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const displayName = product?.name ?? `${PRODUCT.name} - ${PRODUCT.variant}`;

  // Re-validates the applied code whenever quantity/srp change - a code's
  // minimum order value is quantity-dependent, so a code that qualified
  // before the customer bumped the qty stepper down might not anymore.
  useEffect(() => {
    if (!discountCode || srp === null) return;
    const result = applyDiscountCode(srp * quantity, promotions, discountCode);
    if (result.error) {
      setDiscount(null, null, null);
      setCodeError("Your discount code no longer applies to this order - it's been removed.");
    } else {
      setDiscount(discountCode, result.subtotal, result.appliedPromotion?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, srp]);

  function handleApplyCode() {
    if (srp === null || !codeInput.trim()) return;
    const result = applyDiscountCode(srp * quantity, promotions, codeInput);
    if (result.error) {
      setCodeError(result.error);
      return;
    }
    setCodeError(null);
    setDiscount(codeInput.trim().toUpperCase(), result.subtotal, result.appliedPromotion?.id ?? null);
  }

  function handleRemoveCode() {
    setDiscount(null, null, null);
    setCodeInput('');
    setCodeError(null);
  }

  return (
    <div className="rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8">
      <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Order Summary</h2>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-lf-white">{displayName}</p>
          <p className="text-sm text-lf-cream/60">{loading ? '…' : formatPHP(price)} / box</p>
          {partnerPricing && (
            <p className="mt-1 text-xs uppercase tracking-wide2 text-lf-gold">Partner Price Applied</p>
          )}
        </div>
        <QtyStepper value={quantity} onChange={setQuantity} />
      </div>

      {!partnerPricing && (
        <div className="mt-5 border-t border-white/10 pt-5">
          {discountCode ? (
            <div className="flex items-center justify-between gap-3 rounded-sm border border-lf-success/40 bg-lf-success/5 px-4 py-2.5">
              <p className="text-sm text-lf-success">
                Code <span className="font-medium">{discountCode}</span> applied
              </p>
              <button
                type="button"
                onClick={handleRemoveCode}
                className="text-xs text-lf-cream/60 hover:text-lf-error"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <input
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  if (codeError) setCodeError(null);
                }}
                placeholder="Discount code"
                className="min-w-0 flex-1 rounded-sm border border-white/15 bg-lf-black px-4 py-2.5 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none"
              />
              <button
                type="button"
                onClick={handleApplyCode}
                disabled={!codeInput.trim()}
                className="btn-outline !px-4 !py-2.5 !text-sm disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          )}
          {codeError && <p className="mt-2 text-xs text-lf-error">{codeError}</p>}
        </div>
      )}

      <dl className="tabular mt-6 space-y-2 border-t border-white/10 pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-lf-cream/70">Subtotal</dt>
          <dd className="text-lf-white">{formatPHP(subtotal)}</dd>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between">
            <dt className="text-lf-success">Discount</dt>
            <dd className="text-lf-success">-{formatPHP(discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-lf-cream/70">Delivery Fee</dt>
          <dd className="text-lf-white">{formatPHP(deliveryFee)}</dd>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-3 text-base">
          <dt className="font-kicker uppercase tracking-wide2 text-lf-cream/70">Total</dt>
          <dd className="font-display text-xl text-lf-gold">{formatPHP(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
