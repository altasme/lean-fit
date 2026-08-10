import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Container } from '../components/ui/Container';

const LAST_ORDER_KEY = 'lf_last_order';

type ConfirmedOrder = { orderNo: string; customerName: string; isCod: boolean };
type LocationState = ConfirmedOrder | undefined;

export default function OrderConfirmed() {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);

  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.orderNo) {
      setOrder(state);
      return;
    }
    const stored = sessionStorage.getItem(LAST_ORDER_KEY);
    if (stored) {
      setOrder(JSON.parse(stored));
    } else {
      navigate('/', { replace: true });
    }
  }, [location.state, navigate]);

  if (!order) return null;

  return (
    <div className="bg-lf-black py-24 sm:py-32">
      <Container className="max-w-lg text-center">
        <p className="kicker">Order Confirmed</p>
        <h1 className="text-4xl text-lf-white sm:text-5xl">Order Received!</h1>
        <p className="mt-4 text-lf-cream/80">
          Thanks, {order.customerName}. We&apos;ve received your order.
        </p>

        <div className="mt-10 rounded-sm border border-lf-gold/40 bg-lf-charcoal p-8">
          <p className="font-kicker text-sm uppercase tracking-wide2 text-lf-cream/60">
            Order Number
          </p>
          <p className="font-display text-3xl text-lf-gold">#{order.orderNo}</p>

          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-lf-black px-4 py-2">
            {order.isCod ? (
              <>
                <span>🟢</span>
                <span className="font-kicker text-sm uppercase tracking-wide2 text-lf-white">
                  Order Confirmed
                </span>
              </>
            ) : (
              <>
                <span>🟡</span>
                <span className="font-kicker text-sm uppercase tracking-wide2 text-lf-white">
                  Payment Verification
                </span>
              </>
            )}
          </div>
        </div>

        <p className="mt-8 text-sm text-lf-cream/70">
          {order.isCod
            ? "Your order is confirmed for Cash on Delivery — please have the total ready when it arrives. We'll email you as it's packed and shipped."
            : "Our team will verify your payment and email you an update."}{' '}
          A confirmation has also been sent to your email.
        </p>

        <Link to="/" className="btn-outline mt-10 inline-flex">
          Back To Home
        </Link>
      </Container>
    </div>
  );
}
