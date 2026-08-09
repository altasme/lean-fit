import { useNavigate } from 'react-router-dom';
import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { QtyStepper } from '../ui/QtyStepper';
import { PRODUCT } from '../../content/product';
import { formatPHP } from '../../lib/format';
import { useCartStore } from '../../store/cart';

export function Purchase() {
  const navigate = useNavigate();
  const quantity = useCartStore((s) => s.quantity);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const subtotal = useCartStore((s) => s.subtotal());

  const priceUnavailable = PRODUCT.price === null;

  return (
    <section id="purchase" className="bg-lf-black py-20 sm:py-28">
      <Container>
        <div className="mx-auto max-w-xl rounded-sm border border-lf-gold/40 bg-lf-charcoal p-8 shadow-gold-glow sm:p-12">
          <SectionKicker>Get Yours</SectionKicker>
          <h2 className="text-3xl text-lf-white sm:text-4xl">
            {PRODUCT.name} — {PRODUCT.variant}
          </h2>
          <p className="mt-2 text-sm text-lf-cream/70">
            {PRODUCT.sachetsPerBox} sachets · {PRODUCT.boxGrams}g box
          </p>

          <div className="tabular mt-8 flex items-center justify-between">
            <span className="font-kicker text-sm uppercase tracking-wide2 text-lf-cream/70">
              Unit Price
            </span>
            <span className="font-display text-2xl text-lf-white">{formatPHP(PRODUCT.price)}</span>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <span className="font-kicker text-sm uppercase tracking-wide2 text-lf-cream/70">
              Quantity
            </span>
            <QtyStepper value={quantity} onChange={setQuantity} />
          </div>

          <div className="tabular mt-6 flex items-center justify-between border-t border-white/10 pt-6">
            <span className="font-kicker text-sm uppercase tracking-wide2 text-lf-cream/70">
              Subtotal
            </span>
            <span className="font-display text-2xl text-lf-gold">{formatPHP(subtotal)}</span>
          </div>

          <button
            type="button"
            className="btn-gold mt-10 w-full disabled:cursor-not-allowed disabled:opacity-50"
            disabled={priceUnavailable}
            onClick={() => navigate('/checkout')}
          >
            {priceUnavailable ? 'Price Coming Soon' : 'Order Now'}
          </button>
          {priceUnavailable && (
            <p className="mt-3 text-center text-xs text-lf-cream/50">
              Pricing is being finalized — check back soon.
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}
