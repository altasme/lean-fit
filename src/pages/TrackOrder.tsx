import { useState } from 'react';
import { Container } from '../components/ui/Container';
import { SectionKicker } from '../components/ui/SectionKicker';
import { OrderTimeline } from '../components/track-order/OrderTimeline';
import { trackOrder } from '../lib/orderTracking';
import type { TrackedOrder } from '../lib/orderTracking';

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

            <p className="mt-2 text-sm text-lf-cream/60">
              {result.product} × {result.quantity}
            </p>

            <div className="mt-6 border-t border-white/10 pt-6">
              <OrderTimeline
                status={result.status}
                courier={result.courier}
                trackingNumber={result.trackingNumber}
              />
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
