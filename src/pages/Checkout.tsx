import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../components/ui/Container';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { DeliveryForm } from '../components/checkout/DeliveryForm';
import { PaymentMethodSelect } from '../components/checkout/PaymentMethodSelect';
import { ProofUpload } from '../components/checkout/ProofUpload';
import { useCartStore } from '../store/cart';
import { useActiveProduct } from '../hooks/useActiveProduct';
import { PAYMENT_METHODS } from '../content/payment';
import { createOrder } from '../lib/orders';
import { notifyOrderEvent } from '../lib/notify';
import { getStoredReferralCode } from '../lib/referral';
import { validateDeliveryDetails, validateProof } from '../lib/validation';
import { trackInitiateCheckout, trackAddPaymentInfo, trackPurchase } from '../lib/pixel';
import type { DeliveryDetails } from '../types/order';
import type { PaymentMethodId } from '../types/payment';

const LAST_ORDER_KEY = 'lf_last_order';

export default function Checkout() {
  const navigate = useNavigate();
  // Also ensures store pricing is loaded even if this page is reached directly.
  const { partnerReferralCode } = useActiveProduct();
  const { delivery, setDelivery, paymentMethod, setPaymentMethod, quantity } = useCartStore();
  const productName = useCartStore((s) => s.productName);
  const unitPrice = useCartStore((s) => s.unitPrice);
  const deliveryFee = useCartStore((s) => s.deliveryFee);
  const subtotal = useCartStore((s) => s.subtotal());
  const total = useCartStore((s) => s.total());
  const discountAmount = useCartStore((s) => s.discountAmount());
  const appliedDiscountPromotionId = useCartStore((s) => s.appliedDiscountPromotionId);

  const selectedMethod = PAYMENT_METHODS.find((m) => m.code === paymentMethod);
  const requiresProof = selectedMethod?.requiresProof ?? false;

  const [deliveryErrors, setDeliveryErrors] = useState<ReturnType<typeof validateDeliveryDetails>>({});
  const [file, setFile] = useState<File | null>(null);
  const [proofErrors, setProofErrors] = useState<ReturnType<typeof validateProof>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const initiateCheckoutFired = useMemo(() => ({ current: false }), []);

  useEffect(() => {
    if (initiateCheckoutFired.current || subtotal === null) return;
    initiateCheckoutFired.current = true;
    trackInitiateCheckout(subtotal, quantity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const handleDeliveryChange = (field: keyof DeliveryDetails, value: string) => {
    setDelivery({ [field]: value });
    if (deliveryErrors[field]) setDeliveryErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handlePaymentSelect = (method: PaymentMethodId) => {
    setPaymentMethod(method);
    if (total !== null) trackAddPaymentInfo(total);
  };

  const handleProofChange = (patch: { file?: File | null }) => {
    if (patch.file !== undefined) setFile(patch.file);
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    const dErrors = validateDeliveryDetails(delivery);
    const pErrors = requiresProof ? validateProof({ file }) : {};
    setDeliveryErrors(dErrors);
    setProofErrors(pErrors);

    if (Object.keys(dErrors).length > 0 || Object.keys(pErrors).length > 0) {
      document.getElementById('checkout-errors')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!paymentMethod) {
      setSubmitError('Please select a payment method.');
      return;
    }
    if (unitPrice === null || productName === null || subtotal === null || total === null) {
      setSubmitError('Pricing is not yet available for checkout.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        delivery,
        productName,
        quantity,
        // A discount code discounts the order subtotal, not a per-unit
        // price - re-derive unitPrice from the actually-charged subtotal
        // so it never disagrees with subtotal (unitPrice * quantity always
        // equals subtotal on the order record admin sees).
        unitPrice: discountAmount > 0 ? Math.round((subtotal / quantity) * 100) / 100 : unitPrice,
        subtotal,
        deliveryFee,
        total,
        paymentMethod,
        // A signed-in partner buying for themselves is already getting
        // their own tier price (see useActiveProduct/fetchActiveProduct) -
        // attribute the order to themselves too, so it's traceable in
        // Admin's Referral Attribution panel instead of showing a
        // below-SRP price with no explanation. Only overrides a stored
        // `?ref=` code when partner pricing actually applied.
        referralCode: partnerReferralCode ?? getStoredReferralCode(),
        discountAmount,
        appliedPromotionId: appliedDiscountPromotionId,
        ...(requiresProof ? { proofFile: file ?? undefined } : {}),
      });

      trackPurchase({
        value: total,
        numItems: quantity,
        orderId: order.orderId,
      });

      void notifyOrderEvent(order.orderId, requiresProof ? 'order_submitted' : 'order_confirmed_cod', {
        isNewOrder: true,
      });

      sessionStorage.setItem(
        LAST_ORDER_KEY,
        JSON.stringify({
          orderNo: order.orderNo,
          customerName: delivery.customerName,
          isCod: !requiresProof,
        }),
      );

      navigate('/order-confirmed', {
        state: { orderNo: order.orderNo, customerName: delivery.customerName, isCod: !requiresProof },
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-lf-black py-16 sm:py-24">
      <Container className="max-w-3xl">
        <h1 className="text-4xl text-lf-white sm:text-5xl">Checkout</h1>
        <p className="mt-2 text-sm text-lf-cream/70">
          Complete your delivery and payment details below.
        </p>

        <div id="checkout-errors" className="mt-10 space-y-6">
          <OrderSummary />
          <DeliveryForm values={delivery} errors={deliveryErrors} onChange={handleDeliveryChange} />
          <PaymentMethodSelect selected={paymentMethod} onSelect={handlePaymentSelect} />
          {requiresProof && (
            <ProofUpload file={file} errors={proofErrors} onChange={handleProofChange} />
          )}

          {submitError && (
            <p className="rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
              {submitError}
            </p>
          )}

          <button
            type="button"
            className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting…' : 'Submit Order'}
          </button>
        </div>
      </Container>
    </div>
  );
}
