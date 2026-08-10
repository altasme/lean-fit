import { useState } from 'react';
import {
  advanceOrderStatus,
  approvePayment,
  cancelOrder,
  markCodPaid,
  refundPayment,
  rejectPayment,
} from '../../lib/adminOrders';
import { notifyOrderEvent } from '../../lib/notify';
import type { Order } from '../../types/order';
import type { Payment } from '../../types/payment';

export function StatusControls({
  order,
  payment,
  onUpdated,
}: {
  order: Order;
  payment: Payment | null;
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [courier, setCourier] = useState(order.courier ?? '');
  const [tracking, setTracking] = useState(order.tracking_number ?? '');
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
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

  const canCancel = order.status !== 'completed' && order.status !== 'cancelled';

  return (
    <div className="space-y-4">
      {payment && payment.provider === 'manual' && payment.status === 'pending_verification' && (
        <div className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
            Payment Review
          </h2>
          {error && <p className="mt-2 text-xs text-lf-error">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await approvePayment(payment.id, order);
                  await notifyOrderEvent(order.id, 'payment_approved');
                })
              }
              className="btn-gold !px-5 !py-2.5 !text-sm disabled:opacity-50"
            >
              Approve Payment
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await rejectPayment(payment.id);
                  await notifyOrderEvent(order.id, 'payment_rejected');
                })
              }
              className="btn-outline !border-lf-error !px-5 !py-2.5 !text-sm !text-lf-error hover:!bg-lf-error hover:!text-lf-black disabled:opacity-50"
            >
              Reject Payment
            </button>
          </div>
        </div>
      )}

      {payment && payment.provider === 'cod' && payment.status === 'pending' && (
        <div className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
            Cash On Delivery
          </h2>
          {error && <p className="mt-2 text-xs text-lf-error">{error}</p>}
          <p className="mt-2 text-sm text-lf-cream/70">
            Mark this once cash has been collected from the customer.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => markCodPaid(payment.id))}
            className="btn-gold mt-4 !px-5 !py-2.5 !text-sm disabled:opacity-50"
          >
            Mark Paid
          </button>
        </div>
      )}

      <div className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
        <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Fulfillment</h2>
        {error && <p className="mt-2 text-xs text-lf-error">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-3">
          {order.status === 'confirmed' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => advanceOrderStatus(order.id, 'packing'))}
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
                  run(async () => {
                    await advanceOrderStatus(order.id, 'shipped', {
                      courier,
                      tracking_number: tracking,
                    });
                    await notifyOrderEvent(order.id, 'shipped');
                  })
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
              onClick={() => run(() => advanceOrderStatus(order.id, 'completed'))}
              className="btn-gold !px-5 !py-2.5 !text-sm disabled:opacity-50"
            >
              Mark As Completed
            </button>
          )}

          {order.status === 'pending' && (
            <p className="text-sm text-lf-cream/60">
              Awaiting payment verification before this order can move to fulfillment.
            </p>
          )}
          {order.status === 'completed' && (
            <p className="text-sm text-lf-cream/60">This order is complete.</p>
          )}
          {order.status === 'cancelled' && (
            <p className="text-sm text-lf-cream/60">This order was cancelled.</p>
          )}
        </div>
      </div>

      {(canCancel || payment?.status === 'paid') && (
        <div className="rounded-sm border border-lf-error/30 bg-lf-charcoal p-6">
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-error">
            Exceptions
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {payment?.status === 'paid' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => refundPayment(payment.id))}
                className="btn-outline !border-lf-error !px-5 !py-2.5 !text-sm !text-lf-error hover:!bg-lf-error hover:!text-lf-black disabled:opacity-50"
              >
                Refund Payment
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => cancelOrder(order.id))}
                className="btn-outline !border-lf-error !px-5 !py-2.5 !text-sm !text-lf-error hover:!bg-lf-error hover:!text-lf-black disabled:opacity-50"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
