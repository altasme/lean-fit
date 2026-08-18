import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../components/ui/Container';
import { SectionKicker } from '../components/ui/SectionKicker';
import { RESELLER } from '../content/site';
import { submitPartnerLead } from '../lib/partners';
import { fetchAllProvinces, fetchCitiesForProvince } from '../lib/phLocations';
import type { PhCity, PhProvinceOption } from '../lib/phLocations';
import { validatePartnerLead } from '../lib/validation';
import type { PartnerLead, PartnerLeadErrors } from '../lib/validation';

const EMPTY: PartnerLead = { fullName: '', email: '', mobile: '', province: '', city: '' };

const inputClass =
  'w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70';

// Item #7: the public application is now a lead form only - name/mobile/
// email/province/city, nothing about partner type, territory, or package/
// payment. Submitting creates a real `partners` row (status 'pending') so
// it shows up on the admin Pending Partners tab immediately; admin calls
// the lead and completes onboarding themselves from there.
export default function Reseller() {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<PartnerLead>(EMPTY);
  const [errors, setErrors] = useState<PartnerLeadErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [provinces, setProvinces] = useState<PhProvinceOption[] | null>(null);
  const [cities, setCities] = useState<PhCity[] | null>(null);

  useEffect(() => {
    fetchAllProvinces()
      .then(setProvinces)
      .catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    const province = provinces?.find((p) => p.name === form.province);
    if (!province) {
      setCities(null);
      return;
    }
    setCities(null);
    fetchCitiesForProvince(province.id)
      .then(setCities)
      .catch(() => setCities([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.province]);

  function update<K extends keyof PartnerLead>(field: K, value: PartnerLead[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formErrors = validatePartnerLead(form);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitPartnerLead(form);
      setDone(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="bg-lf-black py-24 sm:py-32">
        <Container className="max-w-lg text-center">
          <SectionKicker>{RESELLER.kicker}</SectionKicker>
          <h1 className="text-4xl text-lf-white sm:text-5xl">Thank You!</h1>
          <p className="mt-4 text-lf-cream/80">
            Thank you for showing interest! Our team will reach out to you on the phone number
            provided. Please expect a call shortly.
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

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-5 rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8"
        >
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
            Tell Us About Yourself
          </h2>

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

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Province</label>
              <select
                value={form.province}
                onChange={(e) => update('province', e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.province)}
              >
                <option value="">{provinces ? 'Select…' : 'Loading…'}</option>
                {provinces?.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.province && <p className="mt-1.5 text-xs text-lf-error">{errors.province}</p>}
            </div>
            <div>
              <label className={labelClass}>City / Municipality</label>
              <select
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className={inputClass}
                disabled={!form.province}
                aria-invalid={Boolean(errors.city)}
              >
                <option value="">{cities ? 'Select…' : form.province ? 'Loading…' : 'Select a province first'}</option>
                {cities?.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.city && <p className="mt-1.5 text-xs text-lf-error">{errors.city}</p>}
            </div>
          </div>

          {submitError && (
            <p className="rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
              {submitError}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Apply As Our Partner'}
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
