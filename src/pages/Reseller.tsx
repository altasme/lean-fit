import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../components/ui/Container';
import { SectionKicker } from '../components/ui/SectionKicker';
import { PackagePaymentStep } from '../components/reseller/PackagePaymentStep';
import { TerritoryPicker } from '../components/reseller/TerritoryPicker';
import type { TerritoryPickerValue } from '../components/reseller/TerritoryPicker';
import { RESELLER } from '../content/site';
import { fetchPartnerPackage, submitPartnerApplication } from '../lib/partners';
import type { PartnerPackage } from '../lib/partners';
import { validatePartnerApplication, validatePartnerIdentity } from '../lib/validation';
import type { PartnerApplication, PartnerApplicationErrors } from '../lib/validation';
import { formatPHP } from '../lib/format';
import { PARTNER_TYPE_LABELS } from '../types/partner';
import type { PartnerType } from '../types/partner';

const PARTNER_TYPES: PartnerType[] = ['reseller', 'distributor', 'franchise'];

const EMPTY: PartnerApplication = {
  fullName: '',
  email: '',
  mobile: '',
  address: '',
  partnerType: 'reseller',
  territoryId: '',
  barangayName: null,
};

const inputClass =
  'w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70';

type Step = 'identity' | 'details' | 'payment' | 'done';

export default function Reseller() {
  const [step, setStep] = useState<Step>('identity');
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<PartnerApplication>(EMPTY);
  const [identityErrors, setIdentityErrors] = useState<PartnerApplicationErrors>({});
  const [errors, setErrors] = useState<PartnerApplicationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [packages, setPackages] = useState<Partial<Record<PartnerType, PartnerPackage | null>>>({});
  const [packagesError, setPackagesError] = useState<string | null>(null);

  // Issue #1: transitioning between steps must land the reader at the top
  // of the new content, not wherever the previous step's form happened to
  // end (the identity/details/payment steps are very different heights).
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  useEffect(() => {
    if (step !== 'details' || Object.keys(packages).length > 0) return;
    Promise.all(PARTNER_TYPES.map((type) => fetchPartnerPackage(type)))
      .then((results) => {
        const byType: Partial<Record<PartnerType, PartnerPackage | null>> = {};
        PARTNER_TYPES.forEach((type, i) => {
          byType[type] = results[i];
        });
        setPackages(byType);
      })
      .catch((err) => setPackagesError(err instanceof Error ? err.message : 'Failed to load package pricing.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function update<K extends keyof PartnerApplication>(field: K, value: PartnerApplication[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleTerritoryChange(value: TerritoryPickerValue | null) {
    setForm((f) => ({
      ...f,
      territoryId: value?.territoryId ?? '',
      barangayName: value?.barangayName ?? null,
    }));
    if (errors.territoryId || errors.barangayName) {
      setErrors((prev) => ({ ...prev, territoryId: undefined, barangayName: undefined }));
    }
  }

  function selectPackage(type: PartnerType) {
    setForm((f) => ({ ...f, partnerType: type, territoryId: '', barangayName: null }));
    setErrors((prev) => ({ ...prev, territoryId: undefined, barangayName: undefined }));
  }

  function handleIdentitySubmit(e: React.FormEvent) {
    e.preventDefault();
    const formErrors = validatePartnerIdentity(form);
    setIdentityErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;
    setStep('details');
  }

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formErrors = validatePartnerApplication(form);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitPartnerApplication(form);
      setPartnerId(result.partnerId);
      setStep('payment');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'payment' && partnerId) {
    return (
      <PackagePaymentStep
        partnerId={partnerId}
        partnerType={form.partnerType}
        onDone={() => setStep('done')}
      />
    );
  }

  if (step === 'done') {
    return (
      <div className="bg-lf-black py-24 sm:py-32">
        <Container className="max-w-lg text-center">
          <SectionKicker>{RESELLER.kicker}</SectionKicker>
          <h1 className="text-4xl text-lf-white sm:text-5xl">Application Received!</h1>
          <p className="mt-4 text-lf-cream/80">
            Thanks for applying to become a {PARTNER_TYPE_LABELS[form.partnerType]} partner. We're
            reviewing your payment now - once it's verified, you'll get a separate email with your
            partner portal login details and referral code.
          </p>
          <Link to="/" className="btn-outline mt-10 inline-flex">
            Back To Home
          </Link>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-lf-black py-24 sm:py-32">
      <Container className="max-w-xl">
        <div ref={topRef} className="text-center">
          <SectionKicker>{RESELLER.kicker}</SectionKicker>
          <h1 className="text-4xl text-lf-white sm:text-5xl">{RESELLER.heading}</h1>
          <p className="mt-4 text-lf-cream/80">{RESELLER.intro}</p>
        </div>

        <ul className="mt-10 space-y-3 text-left">
          {RESELLER.benefits.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-3 rounded-sm border border-white/10 bg-lf-charcoal px-5 py-4 text-sm text-lf-cream/90"
            >
              <span className="text-lf-gold">•</span>
              {benefit}
            </li>
          ))}
        </ul>

        {step === 'identity' && (
          <form
            onSubmit={handleIdentitySubmit}
            className="mt-10 space-y-5 rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8"
          >
            <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
              Let's Get Started
            </h2>

            <div>
              <label className={labelClass}>Full Name</label>
              <input
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(identityErrors.fullName)}
              />
              {identityErrors.fullName && (
                <p className="mt-1.5 text-xs text-lf-error">{identityErrors.fullName}</p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Mobile Number</label>
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => update('mobile', e.target.value)}
                  placeholder="09171234567"
                  className={inputClass}
                  aria-invalid={Boolean(identityErrors.mobile)}
                />
                {identityErrors.mobile && (
                  <p className="mt-1.5 text-xs text-lf-error">{identityErrors.mobile}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className={inputClass}
                  aria-invalid={Boolean(identityErrors.email)}
                />
                {identityErrors.email && (
                  <p className="mt-1.5 text-xs text-lf-error">{identityErrors.email}</p>
                )}
              </div>
            </div>

            <button type="submit" className="btn-gold w-full">
              Continue To Package
            </button>
          </form>
        )}

        {step === 'details' && (
          <form
            onSubmit={handleDetailsSubmit}
            className="mt-10 space-y-6 rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8"
          >
            <div>
              <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
                Partner Packages
              </h2>
              {packagesError && <p className="mt-2 text-xs text-lf-error">{packagesError}</p>}
              {Object.keys(packages).length === 0 && !packagesError && (
                <p className="mt-2 text-xs text-lf-cream/50">Loading package pricing…</p>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {PARTNER_TYPES.map((type) => {
                  const pkg = packages[type];
                  const selected = form.partnerType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => selectPackage(type)}
                      className={`rounded-sm border p-4 text-left transition-colors ${
                        selected
                          ? 'border-lf-gold bg-lf-gold/10'
                          : 'border-white/15 hover:border-lf-gold/50'
                      }`}
                    >
                      <p className="font-kicker text-sm uppercase tracking-wide2 text-lf-white">
                        {PARTNER_TYPE_LABELS[type]}
                      </p>
                      {pkg ? (
                        <>
                          <p className="tabular mt-2 text-xs text-lf-cream/60">{pkg.boxes} Boxes</p>
                          <p className="tabular mt-1 text-lg text-lf-gold">{formatPHP(pkg.packageAmount)}</p>
                        </>
                      ) : (
                        <p className="mt-2 text-xs text-lf-cream/40">
                          {pkg === null ? 'Unavailable' : 'Loading…'}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={labelClass}>Complete Address</label>
              <input
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.address)}
              />
              {errors.address && <p className="mt-1.5 text-xs text-lf-error">{errors.address}</p>}
            </div>

            <TerritoryPicker key={form.partnerType} partnerType={form.partnerType} onChange={handleTerritoryChange} />
            {errors.territoryId && <p className="text-xs text-lf-error">{errors.territoryId}</p>}
            {errors.barangayName && <p className="text-xs text-lf-error">{errors.barangayName}</p>}

            {submitError && (
              <p className="rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
                {submitError}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Continue To Payment'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-lf-cream/50">
          Prefer to reach out directly? Email{' '}
          <a href={`mailto:${RESELLER.contactEmail}`} className="text-lf-gold hover:underline">
            {RESELLER.contactEmail}
          </a>
        </p>
      </Container>
    </div>
  );
}
