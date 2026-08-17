import type { ProofFormErrors } from '../../lib/validation';

// Simplified to screenshot-only (dropped reference number / amount paid /
// payment date fields) - sitewide decision, applies to retail checkout and
// the reseller package payment step alike. The receipt image is enough for
// admin to verify a manual payment; the extra fields were friction without
// adding real verification value.
export function ProofUpload({
  file,
  errors,
  onChange,
}: {
  file: File | null;
  errors: ProofFormErrors;
  onChange: (patch: { file?: File | null }) => void;
}) {
  return (
    <div className="rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8">
      <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
        Proof Of Payment
      </h2>

      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
          Screenshot Of Receipt (JPG, PNG, PDF - max 5MB)
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
  );
}
