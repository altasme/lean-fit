import { PAYMENT_METHODS } from '../../content/payment';
import type { PaymentMethodId } from '../../types/payment';

export function PaymentMethodSelect({
  selected,
  onSelect,
  methods = PAYMENT_METHODS,
  helpText = "Choose how you'd like to pay. GCash, Maya, and Bank Transfer require proof of payment; Cash on Delivery doesn't.",
}: {
  selected: PaymentMethodId | null;
  onSelect: (id: PaymentMethodId) => void;
  /** Defaults to all configured methods (retail checkout). Pass a filtered list to exclude e.g. COD. */
  methods?: typeof PAYMENT_METHODS;
  helpText?: string;
}) {
  const active = methods.find((m) => m.code === selected);

  return (
    <div className="rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8">
      <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Payment Method</h2>
      <p className="mt-2 text-sm text-lf-cream/70">{helpText}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {methods.map((method) => (
          <button
            key={method.code}
            type="button"
            onClick={() => onSelect(method.code)}
            className={`rounded-sm border px-4 py-3 text-left font-kicker text-sm uppercase tracking-wide2 transition-colors ${
              selected === method.code
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
          {active.code === 'cod' && (
            <p className="text-lf-cream/80">{active.instructions}</p>
          )}

          {(active.code === 'gcash' || active.code === 'maya') && (
            <>
              <p className="mb-3 text-lf-cream/70">{active.instructions}</p>
              <dl className="tabular space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-lf-cream/60">Account Name</dt>
                  <dd className="text-lf-white">{active.account.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-lf-cream/60">Account Number</dt>
                  <dd className="text-lf-white">{active.account.number}</dd>
                </div>
              </dl>
              {active.qr ? (
                <img src={active.qr} alt={`${active.label} QR code`} className="mt-3 w-40" />
              ) : (
                <p className="mt-3 text-xs text-lf-cream/50">
                  QR code coming soon - please pay using the account details above.
                </p>
              )}
            </>
          )}

          {active.code === 'bank_transfer' && (
            <>
              <p className="mb-3 text-lf-cream/70">{active.instructions}</p>
              <dl className="tabular space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-lf-cream/60">Bank</dt>
                  <dd className="text-lf-white">{active.account.bank}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-lf-cream/60">Account Name</dt>
                  <dd className="text-lf-white">{active.account.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-lf-cream/60">Account Number</dt>
                  <dd className="text-lf-white">{active.account.number}</dd>
                </div>
              </dl>
            </>
          )}
        </div>
      )}
    </div>
  );
}
