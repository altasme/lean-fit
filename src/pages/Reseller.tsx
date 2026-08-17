import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../components/ui/Container';
import { SectionKicker } from '../components/ui/SectionKicker';
import { RESELLER } from '../content/site';
import { submitPartnerApplication } from '../lib/partners';
import { validatePartnerApplication } from '../lib/validation';
import type { PartnerApplication, PartnerApplicationErrors } from '../lib/validation';
import { PARTNER_TYPE_LABELS } from '../types/partner';
import type { PartnerType } from '../types/partner';

const PARTNER_TYPES: PartnerType[] = ['reseller', 'distributor', 'franchise'];

const EMPTY: PartnerApplication = {
  fullName: '',
  email: '',
  mobile: '',
  address: '',
  region: '',
  city: '',
  barangay: '',
  partnerType: 'reseller',
};

const inputClass =
  'w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70';

export default function Reseller() {
  const [form, setForm] = useState<PartnerApplication>(EMPTY);
  const [errors, setErrors] = useState<PartnerApplicationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof PartnerApplication>(field: K, value: PartnerApplication[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formErrors = validatePartnerApplication(form);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitPartnerApplication(form);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-lf-black py-24 sm:py-32">
        <Container className="max-w-lg text-center">
          <SectionKicker>{RESELLER.kicker}</SectionKicker>
          <h1 className="text-4xl text-lf-white sm:text-5xl">Application Received!</h1>
          <p className="mt-4 text-lf-cream/80">
            Thanks for applying to become a {PARTNER_TYPE_LABELS[form.partnerType]} partner. Our
            team will review your application and reach out with next steps for package selection
            and payment.
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
        <div className="text-center">
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

        <form onSubmit={handleSubmit} className="mt-10 space-y-5 rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8">
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
            Partner Application
          </h2>

          <div>
            <label className={labelClass}>Partner Type</label>
            <div className="grid grid-cols-3 gap-2">
              {PARTNER_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => update('partnerType', type)}
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

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Region</label>
              <input
                value={form.region}
                onChange={(e) => update('region', e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.region)}
              />
              {errors.region && <p className="mt-1.5 text-xs text-lf-error">{errors.region}</p>}
            </div>
            <div>
              <label className={labelClass}>City / Municipality</label>
              <input
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.city)}
              />
              {errors.city && <p className="mt-1.5 text-xs text-lf-error">{errors.city}</p>}
            </div>
            <div>
              <label className={labelClass}>Barangay</label>
              <input
                value={form.barangay}
                onChange={(e) => update('barangay', e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.barangay)}
              />
              {errors.barangay && <p className="mt-1.5 text-xs text-lf-error">{errors.barangay}</p>}
            </div>
          </div>

          {submitError && (
            <p className="rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
              {submitError}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>

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
