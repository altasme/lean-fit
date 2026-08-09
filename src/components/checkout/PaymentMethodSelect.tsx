import { PAYMENT_METHODS, PAYMENT_INSTRUCTIONS } from '../../content/payment';
import type { PaymentMethodId } from '../../types/order';

export function PaymentMethodSelect({
  selected,
  onSelect,
}: {
  selected: PaymentMethodId | null;
  onSelect: (id: PaymentMethodId) => void;
}) {
  const active = PAYMENT_METHODS.find((m) => m.id === selected);

  return (
    <div className="rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8">
      <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Payment Method</h2>
      <p className="mt-2 text-sm text-lf-cream/70">{PAYMENT_INSTRUCTIONS}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => onSelect(method.id)}
            className={`rounded-sm border px-4 py-3 text-left font-kicker text-sm uppercase tracking-wide2 transition-colors ${
              selected === method.id
                ? 'border-lf-gold bg-lf-gold/10 text-lf-gold'
                : 'border-white/15 text-lf-cream/80 hover:border-lf-gold/50'
            }`}
          >
            {method.label}
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-5 rounded-sm border border-white/10 bg-lf-black p-5 text-sm">
          {active.id === 'gcash' ? (
            <dl className="tabular space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-lf-cream/60">Account Name</dt>
                <dd className="text-lf-white">{active.accountName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-lf-cream/60">Account Number</dt>
                <dd className="text-lf-white">{active.accountNumber}</dd>
              </div>
              {active.qrImageUrl ? (
                <img src={active.qrImageUrl} alt="GCash QR code" className="mt-3 w-40" />
              ) : (
                <p className="mt-3 text-xs text-lf-cream/50">
                  QR code coming soon — please pay using the account details above.
                </p>
              )}
            </dl>
          ) : (
            <dl className="tabular space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-lf-cream/60">Bank</dt>
                <dd className="text-lf-white">{active.bankName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-lf-cream/60">Account Name</dt>
                <dd className="text-lf-white">{active.accountName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-lf-cream/60">Account Number</dt>
                <dd className="text-lf-white">{active.accountNumber}</dd>
              </div>
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
