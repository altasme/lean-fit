import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PartnerLayout } from '../../components/reseller/PartnerLayout';
import { usePartnerAuth } from '../../components/reseller/PartnerAuthProvider';
import { PackagePaymentStep } from '../../components/reseller/PackagePaymentStep';
import { TerritoryPicker } from '../../components/reseller/TerritoryPicker';
import type { TerritoryPickerValue } from '../../components/reseller/TerritoryPicker';
import { onboardPartner } from '../../lib/partners';
import { validateOnboardPartner } from '../../lib/validation';
import type { OnboardPartnerErrors, OnboardPartnerInput } from '../../lib/validation';
import { ONBOARDABLE_PARTNER_TYPES, PARTNER_TYPE_LABELS } from '../../types/partner';
import type { PartnerType } from '../../types/partner';

const inputClass =
  'w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70';

type Step = 'form' | 'package' | 'done';

const EMPTY: OnboardPartnerInput = {
  fullName: '',
  email: '',
  mobile: '',
  address: '',
  partnerType: 'reseller',
  territoryId: '',
  barangayName: null,
};

export default function AddPartner() {
  const { partner } = usePartnerAuth();
  const [step, setStep] = useState<Step>('form');
  const [newPartnerId, setNewPartnerId] = useState<string | null>(null);

  // partner.partner_type is always set once signed in here - RequirePartnerAuth
  // gates on status === 'active', which only happens after a type is assigned.
  const onboardableTypes = partner ? ONBOARDABLE_PARTNER_TYPES[partner.partner_type!] : [];

  const [form, setForm] = useState<OnboardPartnerInput>({
    ...EMPTY,
    partnerType: onboardableTypes[0] ?? 'reseller',
  });
  const [errors, setErrors] = useState<OnboardPartnerErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update<K extends keyof OnboardPartnerInput>(field: K, value: OnboardPartnerInput[K]) {
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

  function selectPartnerType(type: PartnerType) {
    setForm((f) => ({ ...f, partnerType: type, territoryId: '', barangayName: null }));
    setErrors((prev) => ({ ...prev, partnerType: undefined, territoryId: undefined, barangayName: undefined }));
  }

  if (!partner) return null;

  if (onboardableTypes.length === 0) {
    return (
      <PartnerLayout>
        <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Add Partner</h1>
        <p className="mt-4 max-w-md text-sm text-lf-cream/70">
          Reseller accounts can't onboard other partners. Refer people to the public application
          instead, or ask us to look into upgrading your account.
        </p>
        <Link to="/reseller/dashboard" className="btn-outline mt-6 inline-flex !px-5 !py-2.5 !text-sm">
          Back To Dashboard
        </Link>
      </PartnerLayout>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formErrors = validateOnboardPartner(form);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await onboardPartner(form);
      setNewPartnerId(result.partnerId);
      setStep('package');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'package' && newPartnerId) {
    return (
      <PackagePaymentStep
        partnerId={newPartnerId}
        partnerType={form.partnerType}
        heading={`${form.fullName}'s Starter Package`}
        intro={`You're sponsoring ${form.fullName} as a ${PARTNER_TYPE_LABELS[form.partnerType]} partner. Complete their package payment below - this goes through Lean & Fit's payment processing, same as any other order.`}
        onDone={() => setStep('done')}
      />
    );
  }

  if (step === 'done') {
    return (
      <PartnerLayout>
        <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">
          Partner Onboarded
        </h1>
        <p className="mt-4 max-w-md text-sm text-lf-cream/70">
          {form.fullName}'s application and package payment are submitted. Lean & Fit will review
          and activate their account - you'll see them under your Partner Network once approved.
        </p>
        <Link to="/reseller/dashboard" className="btn-gold mt-6 inline-flex !px-5 !py-2.5 !text-sm">
          Back To Dashboard
        </Link>
      </PartnerLayout>
    );
  }

  // Part 2 §28 containment: a sponsor's own coverage area is fixed, not
  // chosen - a Distributor's new Reseller is always within their own city,
  // a Franchise's new Distributor/Reseller is always within their own
  // region. TerritoryPicker hides the corresponding step's UI accordingly.
  const lockedCityId = partner.partner_type === 'distributor' ? partner.territory_id ?? undefined : undefined;
  const lockedRegionId = partner.partner_type === 'franchise' ? partner.territory_id ?? undefined : undefined;

  return (
    <PartnerLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Add Partner</h1>
      <p className="mt-2 max-w-lg text-sm text-lf-cream/60">
        Onboard a new {onboardableTypes.map((t) => PARTNER_TYPE_LABELS[t]).join(' or ')} partner
        within your coverage area. Payment still goes through Lean & Fit - you're sponsoring their
        package, not collecting it yourself.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-xl space-y-5 rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8"
      >
        {onboardableTypes.length > 1 && (
          <div>
            <label className={labelClass}>Partner Type</label>
            <div className="grid grid-cols-2 gap-2">
              {onboardableTypes.map((type: PartnerType) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => selectPartnerType(type)}
                  className={`rounded-sm border px-3 py-2.5 text-sm font-kicker uppercase tracking-wide2 transition-colors ${
                    form.partnerType === type
                      ? 'border-lf-gold bg-lf-gold text-lf-black'
                      : 'border-white/15 text-lf-cream/70 hover:border-lf-gold/50'
                  }`}
                >
                  {PARTNER_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>Full Name</label>
          <input
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            className={inputClass}
            aria-invalid={Boolean(errors.fullName)}
          />
          {errors.fullName && <p className="mt-1.5 text-xs text-lf-error">{errors.fullName}</p>}
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
              aria-invalid={Boolean(errors.mobile)}
            />
            {errors.mobile && <p className="mt-1.5 text-xs text-lf-error">{errors.mobile}</p>}
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={inputClass}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <p className="mt-1.5 text-xs text-lf-error">{errors.email}</p>}
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

        <TerritoryPicker
          key={form.partnerType}
          partnerType={form.partnerType}
          onChange={handleTerritoryChange}
          lockedRegionId={lockedRegionId}
          lockedCityId={lockedCityId}
        />
        {errors.territoryId && <p className="text-xs text-lf-error">{errors.territoryId}</p>}
        {errors.barangayName && <p className="text-xs text-lf-error">{errors.barangayName}</p>}

        {submitError && (
          <p className="rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
            {submitError}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Continue To Package'}
        </button>
      </form>
    </PartnerLayout>
  );
}
