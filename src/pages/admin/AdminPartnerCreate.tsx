import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { TerritoryPicker } from '../../components/reseller/TerritoryPicker';
import type { TerritoryPickerValue } from '../../components/reseller/TerritoryPicker';
import { useToast } from '../../components/ui/Toast';
import { adminCreatePartner, getPartner } from '../../lib/adminPartners';
import { fetchPartnerPackage } from '../../lib/partners';
import { validateAdminCreatePartner } from '../../lib/validation';
import type { AdminCreatePartnerErrors, AdminCreatePartnerInput } from '../../lib/validation';
import { PAYMENT_METHODS } from '../../content/payment';
import { PARTNER_TYPE_LABELS } from '../../types/partner';
import type { PartnerType } from '../../types/partner';

const PARTNER_TYPES: PartnerType[] = ['reseller', 'distributor', 'franchise'];
const MANUAL_METHODS = PAYMENT_METHODS.filter((m) => m.provider === 'manual');

const inputClass =
  'w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70';

const EMPTY: AdminCreatePartnerInput = {
  existingLeadId: null,
  fullName: '',
  email: '',
  mobile: '',
  address: '',
  partnerType: null,
  territoryId: '',
  barangayName: null,
  packageBoxes: null,
  packageAmount: null,
  paymentMethod: null,
  paymentReference: '',
  paymentAmount: null,
  paymentDate: '',
  activate: true,
};

// Item #2 - admin manually adds a partner (or completes a Pending lead's
// onboarding via ?leadId=). Full control: type, real territory (unrestricted
// picker, no sponsor containment since there's no sponsor), package, and a
// payment record admin already collected over the phone/bank transfer.
export default function AdminPartnerCreate() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');

  const [form, setForm] = useState<AdminCreatePartnerInput>(EMPTY);
  const [errors, setErrors] = useState<AdminCreatePartnerErrors>({});
  const [leadHint, setLeadHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [packageAmountTouched, setPackageAmountTouched] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    getPartner(leadId)
      .then((lead) => {
        setForm((f) => ({ ...f, existingLeadId: lead.id, fullName: lead.full_name, email: lead.email, mobile: lead.mobile }));
        setLeadHint([lead.city, lead.province].filter(Boolean).join(', '));
      })
      .catch(() => showToast('Could not load that lead - starting a fresh form.', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  useEffect(() => {
    if (!form.partnerType || packageAmountTouched) return;
    fetchPartnerPackage(form.partnerType)
      .then((pkg) => {
        if (!pkg) return;
        setForm((f) => ({ ...f, packageBoxes: pkg.boxes, packageAmount: pkg.packageAmount }));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.partnerType]);

  function update<K extends keyof AdminCreatePartnerInput>(field: K, value: AdminCreatePartnerInput[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field as keyof AdminCreatePartnerErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleTerritoryChange(value: TerritoryPickerValue | null) {
    setForm((f) => ({ ...f, territoryId: value?.territoryId ?? '', barangayName: value?.barangayName ?? null }));
    if (errors.territoryId || errors.barangayName) {
      setErrors((prev) => ({ ...prev, territoryId: undefined, barangayName: undefined }));
    }
  }

  function selectType(type: PartnerType) {
    setForm((f) => ({ ...f, partnerType: type, territoryId: '', barangayName: null }));
    setPackageAmountTouched(false);
    setErrors((prev) => ({ ...prev, partnerType: undefined, territoryId: undefined, barangayName: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formErrors = validateAdminCreatePartner(form);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await adminCreatePartner(form);
      showToast(form.activate ? 'Partner created and activated.' : 'Partner saved as pending.');
      navigate(`/admin/partners/${result.partnerId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <Link to="/admin/partners" className="text-sm text-lf-gold hover:underline">
        ← Back to partners
      </Link>
      <h1 className="mt-4 font-kicker text-2xl uppercase tracking-wide2 text-lf-white">
        {leadId ? 'Complete Partner Onboarding' : 'Add Partner'}
      </h1>
      {leadHint && (
        <p className="mt-1 text-sm text-lf-cream/60">Lead's stated location: {leadHint}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-6">
        <section className="space-y-5 rounded-sm border border-white/10 bg-lf-charcoal p-6">
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Details</h2>

          <div>
            <label className={labelClass}>Full Name</label>
            <input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className={inputClass} />
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
              />
              {errors.mobile && <p className="mt-1.5 text-xs text-lf-error">{errors.mobile}</p>}
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass} />
              {errors.email && <p className="mt-1.5 text-xs text-lf-error">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <input value={form.address} onChange={(e) => update('address', e.target.value)} className={inputClass} />
          </div>
        </section>

        <section className="space-y-5 rounded-sm border border-white/10 bg-lf-charcoal p-6">
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Type &amp; Territory</h2>

          <div className="grid grid-cols-3 gap-2">
            {PARTNER_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => selectType(type)}
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
          {errors.partnerType && <p className="text-xs text-lf-error">{errors.partnerType}</p>}

          {form.partnerType && (
            <TerritoryPicker key={form.partnerType} partnerType={form.partnerType} onChange={handleTerritoryChange} />
          )}
          {errors.territoryId && <p className="text-xs text-lf-error">{errors.territoryId}</p>}
          {errors.barangayName && <p className="text-xs text-lf-error">{errors.barangayName}</p>}
        </section>

        <section className="space-y-5 rounded-sm border border-white/10 bg-lf-charcoal p-6">
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Package &amp; Payment</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Boxes</label>
              <input
                type="number"
                min={1}
                value={form.packageBoxes ?? ''}
                onChange={(e) => update('packageBoxes', e.target.value === '' ? null : Number(e.target.value))}
                className={`${inputClass} tabular`}
              />
            </div>
            <div>
              <label className={labelClass}>Package Amount (₱)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.packageAmount ?? ''}
                onChange={(e) => {
                  setPackageAmountTouched(true);
                  update('packageAmount', e.target.value === '' ? null : Number(e.target.value));
                }}
                className={`${inputClass} tabular`}
              />
              {form.partnerType && form.packageAmount != null && (
                <p className="mt-1 text-xs text-lf-cream/40">
                  Auto-filled from {PARTNER_TYPE_LABELS[form.partnerType]} tier pricing - edit if the actual
                  price agreed differs.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Payment Method</label>
              <select
                value={form.paymentMethod ?? ''}
                onChange={(e) => update('paymentMethod', (e.target.value || null) as AdminCreatePartnerInput['paymentMethod'])}
                className={inputClass}
              >
                <option value="">Not collected yet</option>
                {MANUAL_METHODS.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Reference No.</label>
              <input
                value={form.paymentReference}
                onChange={(e) => update('paymentReference', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Amount Paid (₱)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.paymentAmount ?? ''}
                onChange={(e) => update('paymentAmount', e.target.value === '' ? null : Number(e.target.value))}
                className={`${inputClass} tabular`}
              />
            </div>
            <div>
              <label className={labelClass}>Payment Date</label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) => update('paymentDate', e.target.value)}
                className={`${inputClass} tabular`}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-lf-cream/80">
            <input
              type="checkbox"
              checked={form.activate}
              onChange={(e) => update('activate', e.target.checked)}
              className="h-4 w-4 rounded-sm border-white/20 bg-lf-black accent-lf-gold"
            />
            Activate immediately (payment already collected - marks paid, generates referral code,
            and emails portal access)
          </label>
          {!form.activate && (
            <p className="text-xs text-lf-cream/50">
              Saved as pending instead - approve later from the partner's detail page once payment is confirmed.
            </p>
          )}
        </section>

        {submitError && (
          <p className="rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
            {submitError}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-50">
          {submitting ? 'Saving…' : leadId ? 'Complete Onboarding' : 'Add Partner'}
        </button>
      </form>
    </AdminLayout>
  );
}
