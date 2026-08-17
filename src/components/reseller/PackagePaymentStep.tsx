import { useEffect, useState } from 'react';
import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { PaymentMethodSelect } from '../checkout/PaymentMethodSelect';
import { ProofUpload } from '../checkout/ProofUpload';
import { RESELLER } from '../../content/site';
import { PAYMENT_METHODS } from '../../content/payment';
import { fetchPartnerPackage, submitPartnerPackagePayment } from '../../lib/partners';
import type { PartnerPackage } from '../../lib/partners';
import { validateProof } from '../../lib/validation';
import type { ProofFormErrors } from '../../lib/validation';
import { formatPHP } from '../../lib/format';
import { PARTNER_TYPE_LABELS } from '../../types/partner';
import type { PartnerType } from '../../types/partner';
import type { PaymentMethodId } from '../../types/payment';

// Package payment is a one-time upfront investment, not a delivery order -
// COD makes no sense here (spec Part 1 §17-20 frames this as the same
// manual-payment flow retail checkout uses, minus the COD branch).
const PACKAGE_PAYMENT_METHODS = PAYMENT_METHODS.filter((m) => m.provider === 'manual');

// Shared by the public application (/reseller, Phase B/C) and
// partner-assisted onboarding (/reseller/add-partner, Part 2) - same
// package/payment shape regardless of who's submitting it or for whom.
export function PackagePaymentStep({
  partnerId,
  partnerType,
  heading = 'Your Starter Package',
  intro,
  onDone,
}: {
  partnerId: string;
  partnerType: PartnerType;
  heading?: string;
  intro?: string;
  onDone: () => void;
}) {
  const [pkg, setPkg] = useState<PartnerPackage | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<ProofFormErrors>({});
  const [methodError, setMethodError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPartnerPackage(partnerType)
      .then((result) => {
        if (!cancelled) setPkg(result);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load package pricing.');
      });
    return () => {
      cancelled = true;
    };
  }, [partnerType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pkg) return;

    if (!paymentMethod) {
      setMethodError('Select a payment method.');
      return;
    }
    setMethodError(null);

    const parsedAmount = amountPaid ? Number(amountPaid) : null;
    const formErrors = validateProof({
      referenceNumber,
      amountPaid: parsedAmount,
      paymentDate,
      file,
    });
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0 || !file || parsedAmount === null) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitPartnerPackagePayment({
        partnerId,
        pkg,
        paymentMethod,
        referenceNumber,
        amountPaid: parsedAmount,
        paymentDate,
        proofFile: file,
      });
      onDone();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-lf-black py-24 sm:py-32">
      <Container className="max-w-xl">
        <div className="text-center">
          <SectionKicker>{RESELLER.kicker}</SectionKicker>
          <h1 className="text-4xl text-lf-white sm:text-5xl">{heading}</h1>
          <p className="mt-4 text-lf-cream/80">
            {intro ??
              `Application received. Complete your ${PARTNER_TYPE_LABELS[partnerType]} package payment below to finish your application.`}
          </p>
        </div>

        {loadError && (
          <p className="mt-8 rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
            {loadError}
          </p>
        )}

        {pkg === undefined && !loadError && (
          <p className="mt-8 text-center text-sm text-lf-cream/60">Loading package details…</p>
        )}

        {pkg === null && !loadError && (
          <p className="mt-8 rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
            Package pricing isn't available right now. Please email{' '}
            <a href={`mailto:${RESELLER.contactEmail}`} className="underline">
              {RESELLER.contactEmail}
            </a>{' '}
            and we'll get you set up.
          </p>
        )}

        {pkg && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8">
              <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
                {PARTNER_TYPE_LABELS[partnerType]} Package
              </h2>
              <dl className="tabular mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-lf-cream/60">Boxes</dt>
                  <dd className="text-lf-white">{pkg.boxes}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-lf-cream/60">Price Per Box</dt>
                  <dd className="text-lf-white">{formatPHP(pkg.unitPrice)}</dd>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-1.5 text-base">
                  <dt className="text-lf-cream/80">Total</dt>
                  <dd className="text-lf-gold">{formatPHP(pkg.packageAmount)}</dd>
                </div>
              </dl>
            </div>

            <PaymentMethodSelect
              selected={paymentMethod}
              onSelect={setPaymentMethod}
              methods={PACKAGE_PAYMENT_METHODS}
              helpText="Pay the package total using one of the methods below, then submit proof of payment."
            />
            {methodError && <p className="text-xs text-lf-error">{methodError}</p>}

            <ProofUpload
              referenceNumber={referenceNumber}
              amountPaid={amountPaid}
              paymentDate={paymentDate}
              file={file}
              errors={errors}
              onChange={(patch) => {
                if (patch.referenceNumber !== undefined) setReferenceNumber(patch.referenceNumber);
                if (patch.amountPaid !== undefined) setAmountPaid(patch.amountPaid);
                if (patch.paymentDate !== undefined) setPaymentDate(patch.paymentDate);
                if (patch.file !== undefined) setFile(patch.file);
              }}
            />

            {submitError && (
              <p className="rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
                {submitError}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit Package Payment'}
            </button>
          </form>
        )}
      </Container>
    </div>
  );
}
