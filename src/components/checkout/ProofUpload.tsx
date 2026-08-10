import type { ProofFormErrors } from '../../lib/validation';

export function ProofUpload({
  referenceNumber,
  amountPaid,
  paymentDate,
  file,
  errors,
  onChange,
}: {
  referenceNumber: string;
  amountPaid: string;
  paymentDate: string;
  file: File | null;
  errors: ProofFormErrors;
  onChange: (patch: {
    referenceNumber?: string;
    amountPaid?: string;
    paymentDate?: string;
    file?: File | null;
  }) => void;
}) {
  return (
    <div className="rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8">
      <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
        Proof Of Payment
      </h2>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
            Reference Number
          </label>
          <input
            value={referenceNumber}
            onChange={(e) => onChange({ referenceNumber: e.target.value })}
            className="w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
          />
          {errors.referenceNumber && (
            <p className="mt-1.5 text-xs text-lf-error">{errors.referenceNumber}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
            Amount Paid (₱)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amountPaid}
            onChange={(e) => onChange({ amountPaid: e.target.value })}
            className="tabular w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
          />
          {errors.amountPaid && <p className="mt-1.5 text-xs text-lf-error">{errors.amountPaid}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
            Payment Date
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => onChange({ paymentDate: e.target.value })}
            className="tabular w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
          />
          {errors.paymentDate && <p className="mt-1.5 text-xs text-lf-error">{errors.paymentDate}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
            Upload Proof (JPG, PNG, PDF - max 5MB)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(e) => onChange({ file: e.target.files?.[0] ?? null })}
            className="w-full rounded-sm border border-white/15 bg-lf-black px-4 py-2.5 text-sm text-lf-cream/80 file:mr-4 file:rounded-sm file:border-0 file:bg-lf-gold file:px-3 file:py-1.5 file:font-kicker file:text-xs file:uppercase file:tracking-wide2 file:text-lf-black"
          />
          {file && <p className="mt-1.5 text-xs text-lf-cream/50">{file.name}</p>}
          {errors.file && <p className="mt-1.5 text-xs text-lf-error">{errors.file}</p>}
        </div>
      </div>
    </div>
  );
}
