import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../components/ui/Container';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { DeliveryForm } from '../components/checkout/DeliveryForm';
import { PaymentMethodSelect } from '../components/checkout/PaymentMethodSelect';
import { ProofUpload } from '../components/checkout/ProofUpload';
import { useCartStore } from '../store/cart';
import { PRODUCT } from '../content/product';
import { createOrder } from '../lib/orders';
import { notifyOrderEvent } from '../lib/notify';
import { validateDeliveryDetails, validateProof } from '../lib/validation';
import { trackInitiateCheckout, trackAddPaymentInfo, trackPurchase } from '../lib/pixel';
import type { DeliveryDetails } from '../types/order';

const LAST_ORDER_KEY = 'lf_last_order';

export default function Checkout() {
  const navigate = useNavigate();
  const { delivery, setDelivery, paymentMethod, setPaymentMethod, quantity } = useCartStore();
  const subtotal = useCartStore((s) => s.subtotal());
  const total = useCartStore((s) => s.total());

  const [deliveryErrors, setDeliveryErrors] = useState<ReturnType<typeof validateDeliveryDetails>>({});
  const [referenceNumber, setReferenceNumber] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
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

  const handlePaymentSelect = (method: 'gcash' | 'bank_transfer') => {
    setPaymentMethod(method);
    if (total !== null) trackAddPaymentInfo(total);
  };

  const handleProofChange = (patch: {
    referenceNumber?: string;
    amountPaid?: string;
    paymentDate?: string;
    file?: File | null;
  }) => {
    if (patch.referenceNumber !== undefined) setReferenceNumber(patch.referenceNumber);
    if (patch.amountPaid !== undefined) setAmountPaid(patch.amountPaid);
    if (patch.paymentDate !== undefined) setPaymentDate(patch.paymentDate);
    if (patch.file !== undefined) setFile(patch.file);
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    const dErrors = validateDeliveryDetails(delivery);
    const pErrors = validateProof({
      referenceNumber,
      amountPaid: amountPaid === '' ? null : Number(amountPaid),
      paymentDate,
      file,
    });
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
    if (PRODUCT.price === null || subtotal === null || total === null || !file) {
      setSubmitError('Pricing is not yet available for checkout.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        delivery,
        quantity,
        unitPrice: PRODUCT.price,
        subtotal,
        deliveryFee: PRODUCT.deliveryFee,
        total,
        paymentMethod,
        referenceNumber,
        amountPaid: Number(amountPaid),
        paymentDate,
        proofFile: file,
      });

      trackPurchase({
        value: total,
        numItems: quantity,
        orderId: order.id,
      });

      void notifyOrderEvent(order.id, order.status, { isNewOrder: true });

      sessionStorage.setItem(
        LAST_ORDER_KEY,
        JSON.stringify({ orderNo: order.orderNo, customerName: delivery.customerName }),
      );

      navigate('/order-confirmed', {
        state: { orderNo: order.orderNo, customerName: delivery.customerName },
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
          <ProofUpload
            referenceNumber={referenceNumber}
            amountPaid={amountPaid}
            paymentDate={paymentDate}
            file={file}
            errors={proofErrors}
            onChange={handleProofChange}
          />

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
