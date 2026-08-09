import { useState } from 'react';
import { updateOrderStatus } from '../../lib/adminOrders';
import { notifyOrderEvent } from '../../lib/notify';
import type { Order } from '../../types/order';

export function StatusControls({ order, onUpdated }: { order: Order; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [courier, setCourier] = useState(order.courier ?? '');
  const [tracking, setTracking] = useState(order.tracking_number ?? '');
  const [error, setError] = useState<string | null>(null);

  const run = async (
    action: () => Promise<void>,
  ) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  };

  const advance = (status: Order['status'], note: string, extra?: { courier?: string; tracking_number?: string }) =>
    run(async () => {
      await updateOrderStatus(order.id, status, note, extra);
      await notifyOrderEvent(order.id, status);
    });

  return (
    <div className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
      <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Status Controls</h2>
      {error && <p className="mt-2 text-xs text-lf-error">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        {order.status === 'payment_verification' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => advance('payment_approved', 'Payment approved by admin')}
              className="btn-gold !px-5 !py-2.5 !text-sm disabled:opacity-50"
            >
              Approve Payment
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => advance('payment_rejected', 'Payment rejected by admin')}
              className="btn-outline !border-lf-error !px-5 !py-2.5 !text-sm !text-lf-error hover:!bg-lf-error hover:!text-lf-black disabled:opacity-50"
            >
              Reject Payment
            </button>
          </>
        )}

        {order.status === 'payment_rejected' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => advance('payment_verification', 'Customer resubmitted, back to verification')}
            className="btn-outline !px-5 !py-2.5 !text-sm disabled:opacity-50"
          >
            Return To Verification
          </button>
        )}

        {order.status === 'payment_approved' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => advance('packing', 'Order moved to packing')}
            className="btn-gold !px-5 !py-2.5 !text-sm disabled:opacity-50"
          >
            Move To Packing
          </button>
        )}

        {order.status === 'packing' && (
          <div className="w-full space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Courier"
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="rounded-sm border border-white/15 bg-lf-black px-4 py-2.5 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
              />
              <input
                placeholder="Tracking Number"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                className="rounded-sm border border-white/15 bg-lf-black px-4 py-2.5 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
              />
            </div>
            <button
              type="button"
              disabled={busy || !courier || !tracking}
              onClick={() =>
                advance('shipped', 'Order shipped', { courier, tracking_number: tracking })
              }
              className="btn-gold !px-5 !py-2.5 !text-sm disabled:opacity-50"
            >
              Mark As Shipped
            </button>
          </div>
        )}

        {order.status === 'shipped' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => advance('completed', 'Order completed')}
            className="btn-gold !px-5 !py-2.5 !text-sm disabled:opacity-50"
          >
            Mark As Completed
          </button>
        )}

        {order.status === 'completed' && (
          <p className="text-sm text-lf-cream/60">This order is complete.</p>
        )}
      </div>
    </div>
  );
}
