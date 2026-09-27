import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Container } from '../components/ui/Container';
import { checkGanapStatus } from '../lib/ganap';

const LAST_ORDER_KEY = 'lf_last_order';

type ConfirmedOrder = {
  orderNo: string;
  customerName: string;
  isCod: boolean;
  /** True for the Ganap gateway method - payment isn't verified yet, see below. */
  isGateway?: boolean;
  /** Only needed for the gateway status poll below. */
  orderId?: string;
};
type LocationState = ConfirmedOrder | undefined;

/**
 * Ganap's redirect back after checkout is a real, top-level, cross-domain
 * navigation (unlike every other payment method here, which stays on this
 * app the whole time) - so on top of the existing location.state and
 * sessionStorage sources, this page also accepts the order details as URL
 * query params, which is the one source guaranteed to survive that trip.
 * See supabase/functions/ganap-checkout, which builds successRedirectUrl
 * with these exact params.
 */
function readFromQueryParams(params: URLSearchParams): ConfirmedOrder | null {
  const orderNo = params.get('order_no');
  if (!orderNo) return null;
  return {
    orderNo,
    customerName: params.get('customer') ?? '',
    isCod: false,
    isGateway: params.get('gateway') === '1',
    orderId: params.get('order_id') ?? undefined,
  };
}

/** How long to poll Ganap for a settled status before giving up and leaving it to the webhook. */
const GATEWAY_POLL_ATTEMPTS = 5;
const GATEWAY_POLL_INTERVAL_MS = 3000;

export default function OrderConfirmed() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<'pending' | 'paid' | 'failed' | 'expired'>('pending');
  const pollAttempts = useRef(0);

  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.orderNo) {
      setOrder(state);
      return;
    }

    const stored = sessionStorage.getItem(LAST_ORDER_KEY);
    if (stored) {
      setOrder(JSON.parse(stored));
      return;
    }

    const fromQuery = readFromQueryParams(searchParams);
    if (fromQuery) {
      setOrder(fromQuery);
      return;
    }

    navigate('/', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, navigate]);

  useEffect(() => {
    if (!order?.isGateway || !order.orderId) return;

    const interval = setInterval(async () => {
      pollAttempts.current += 1;
      try {
        const { status, paid } = await checkGanapStatus(order.orderId!);
        if (paid) {
          setGatewayStatus('paid');
          clearInterval(interval);
        } else if (status === 'failed' || status === 'expired') {
          setGatewayStatus(status);
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Ganap status check failed:', err);
      }
      if (pollAttempts.current >= GATEWAY_POLL_ATTEMPTS) clearInterval(interval);
    }, GATEWAY_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [order]);

  if (!order) return null;

  const gatewayPending = order.isGateway && gatewayStatus === 'pending';
  const gatewayFailed = order.isGateway && (gatewayStatus === 'failed' || gatewayStatus === 'expired');
  const gatewayPaid = order.isGateway && gatewayStatus === 'paid';

  return (
    <div className="bg-lf-black py-24 sm:py-32">
      <Container className="max-w-lg text-center">
        <p className="kicker">Order Confirmed</p>
        <h1 className="text-4xl text-lf-white sm:text-5xl">Order Received!</h1>
        <p className="mt-4 text-lf-cream/80">
          Thanks, {order.customerName || 'there'}. We&apos;ve received your order.
        </p>

        <div className="mt-10 rounded-sm border border-lf-gold/40 bg-lf-charcoal p-8">
          <p className="font-kicker text-sm uppercase tracking-wide2 text-lf-cream/60">
            Order Number
          </p>
          <p className="font-display text-3xl text-lf-gold">#{order.orderNo}</p>

          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-lf-black px-4 py-2">
            {gatewayFailed ? (
              <>
                <span>🔴</span>
                <span className="font-kicker text-sm uppercase tracking-wide2 text-lf-white">
                  Payment {gatewayStatus === 'expired' ? 'Expired' : 'Failed'}
                </span>
              </>
            ) : gatewayPending ? (
              <>
                <span>🟡</span>
                <span className="font-kicker text-sm uppercase tracking-wide2 text-lf-white">
                  Confirming Payment
                </span>
              </>
            ) : order.isCod || gatewayPaid ? (
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
          {gatewayFailed
            ? "We couldn't confirm your payment. If you were charged, contact us and we'll sort it out - otherwise please place your order again."
            : gatewayPending
              ? "We're confirming your payment with our payment partner. This usually takes just a few seconds - you'll get an email as soon as it's verified."
              : gatewayPaid
                ? "Your payment is verified. We'll pack your order and ship it shortly."
                : order.isCod
                  ? "Your order is confirmed for Cash on Delivery — please have the total ready when it arrives. We'll email you as it's packed and shipped."
                  : 'Our team will verify your payment and email you an update.'}{' '}
          A confirmation has also been sent to your email.
        </p>

        <Link to="/" className="btn-outline mt-10 inline-flex">
          Back To Home
        </Link>
      </Container>
    </div>
  );
}
