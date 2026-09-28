import { ORDER_TIMELINE_STEPS, ORDER_TRACKING_MESSAGES } from '../../content/orderTracking';
import type { OrderStatus } from '../../types/order';

const EXCEPTION_STATUSES: OrderStatus[] = ['cancelled', 'returned'];

export function OrderTimeline({
  status,
  courier,
  trackingNumber,
}: {
  status: OrderStatus;
  courier: string | null;
  trackingNumber: string | null;
}) {
  if (EXCEPTION_STATUSES.includes(status)) {
    return (
      <div className="rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
        {ORDER_TRACKING_MESSAGES[status]}
      </div>
    );
  }

  const currentIndex = ORDER_TIMELINE_STEPS.findIndex((step) => step.status === status);

  return (
    <ol>
      {ORDER_TIMELINE_STEPS.map((step, i) => {
        const reached = i <= currentIndex;
        const isCurrent = i === currentIndex;
        const isLast = i === ORDER_TIMELINE_STEPS.length - 1;

        return (
          <li key={step.status} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={`absolute left-[11px] top-6 h-full w-px ${
                  i < currentIndex ? 'bg-lf-gold' : 'bg-white/15'
                }`}
              />
            )}

            <span
              aria-hidden
              className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] ${
                reached
                  ? 'border-lf-gold bg-lf-gold text-lf-black'
                  : 'border-white/20 bg-lf-black text-transparent'
              }`}
            >
              {reached ? '✓' : ''}
            </span>

            <div className="pt-0.5">
              <p
                className={`font-kicker text-sm uppercase tracking-wide2 ${
                  reached ? 'text-lf-white' : 'text-lf-cream/40'
                }`}
              >
                {step.label}
              </p>

              {isCurrent && (
                <div className="mt-1.5 text-sm text-lf-cream/80">
                  <p>{ORDER_TRACKING_MESSAGES[step.status]}</p>
                  {step.status === 'shipped' && (courier || trackingNumber) && (
                    <dl className="tabular mt-2 space-y-1">
                      {courier && (
                        <div className="flex gap-2">
                          <dt className="text-lf-cream/50">Courier:</dt>
                          <dd className="text-lf-white">{courier}</dd>
                        </div>
                      )}
                      {trackingNumber && (
                        <div className="flex gap-2">
                          <dt className="text-lf-cream/50">Tracking number:</dt>
                          <dd className="text-lf-white">{trackingNumber}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
