import { useState } from 'react';
import { Container } from '../components/ui/Container';
import { SectionKicker } from '../components/ui/SectionKicker';
import { trackOrder } from '../lib/orderTracking';
import type { TrackedOrder } from '../lib/orderTracking';
import { ORDER_STATUS_LABELS, ORDER_STATUS_EMOJI } from '../types/order';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_EMOJI } from '../types/payment';

const inputClass =
  'w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none';

export default function TrackOrder() {
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackedOrder | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter your order number or tracking number.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const order = await trackOrder(query.trim());
      setResult(order);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-lf-black py-16 sm:py-24">
      <Container className="max-w-lg">
        <SectionKicker>Order Status</SectionKicker>
        <h1 className="text-4xl text-lf-white sm:text-5xl">Track My Order</h1>
        <p className="mt-4 text-lf-cream/80">
          Enter your order number (e.g. LF-000123) or your shipping tracking number to check your
          order&apos;s status.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Order number or tracking number"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={submitting}
            className="btn-gold shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Searching…' : 'Track Order'}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
            {error}
          </p>
        )}

        {searched && !error && !result && (
          <p className="mt-8 text-sm text-lf-cream/60">
            We couldn&apos;t find an order matching that number. Please double-check it and try
            again, or contact us for help.
          </p>
        )}

        {result && (
          <div className="mt-8 rounded-sm border border-lf-gold/40 bg-lf-charcoal p-6 sm:p-8">
            <p className="font-kicker text-sm uppercase tracking-wide2 text-lf-cream/60">
              Order Number
            </p>
            <p className="font-display text-3xl text-lf-gold">#{result.orderNo}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-lf-black px-4 py-2">
                <span>{ORDER_STATUS_EMOJI[result.status]}</span>
                <span className="font-kicker text-sm uppercase tracking-wide2 text-lf-white">
                  {ORDER_STATUS_LABELS[result.status]}
                </span>
              </div>
              {result.paymentStatus && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-lf-black px-4 py-2">
                  <span>{PAYMENT_STATUS_EMOJI[result.paymentStatus]}</span>
                  <span className="font-kicker text-sm uppercase tracking-wide2 text-lf-white">
                    Payment: {PAYMENT_STATUS_LABELS[result.paymentStatus]}
                  </span>
                </div>
              )}
            </div>

            <dl className="tabular mt-6 space-y-2 border-t border-white/10 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-lf-cream/60">Product</dt>
                <dd className="text-lf-white">
                  {result.product} × {result.quantity}
                </dd>
              </div>
              {result.courier && (
                <div className="flex justify-between">
                  <dt className="text-lf-cream/60">Courier</dt>
                  <dd className="text-lf-white">{result.courier}</dd>
                </div>
              )}
              {result.trackingNumber && (
                <div className="flex justify-between">
                  <dt className="text-lf-cream/60">Tracking Number</dt>
                  <dd className="text-lf-white">{result.trackingNumber}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </Container>
    </div>
  );
}
