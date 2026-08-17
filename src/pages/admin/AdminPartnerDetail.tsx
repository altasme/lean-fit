import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { approvePartner, getPartner, getPartnerProofSignedUrl, rejectPartner } from '../../lib/adminPartners';
import { useToast } from '../../components/ui/Toast';
import { formatPHP } from '../../lib/format';
import type { Partner } from '../../types/partner';
import { PARTNER_STATUS_LABELS, PARTNER_TYPE_LABELS } from '../../types/partner';
import { PAYMENT_STATUS_EMOJI, PAYMENT_STATUS_LABELS } from '../../types/payment';

const METHOD_LABELS: Record<string, string> = {
  gcash: 'GCash',
  maya: 'Maya',
  bank_transfer: 'Bank Transfer',
};

export default function AdminPartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const p = await getPartner(id);
      setPartner(p);
      setProofUrl(p.payment_proof_path ? await getPartnerProofSignedUrl(p.payment_proof_path) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partner.');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove() {
    if (!partner) return;
    setBusy(true);
    try {
      const { referralCode } = await approvePartner(partner.id);
      showToast(`Partner approved - referral code ${referralCode}`);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Approval failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!partner) return;
    setBusy(true);
    try {
      await rejectPartner(partner.id);
      showToast('Partner application rejected');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Rejection failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <AdminLayout>
        <p className="text-sm text-lf-error">{error}</p>
      </AdminLayout>
    );
  }

  if (!partner) {
    return (
      <AdminLayout>
        <p className="text-sm text-lf-cream/60">Loading partner…</p>
      </AdminLayout>
    );
  }

  const canDecide = partner.status === 'pending';

  return (
    <AdminLayout>
      <Link to="/admin/partners" className="text-sm text-lf-gold hover:underline">
        ← Back to partners
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">
          {partner.full_name}
        </h1>
        <span className="rounded-full border border-white/10 bg-lf-charcoal px-4 py-1.5 text-sm">
          {PARTNER_STATUS_LABELS[partner.status]}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
            <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Applicant</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Type" value={PARTNER_TYPE_LABELS[partner.partner_type]} />
              <Row label="Email" value={partner.email} />
              <Row label="Mobile" value={partner.mobile} />
              <Row label="Address" value={partner.address ?? '—'} />
              <Row
                label="Location"
                value={[partner.barangay, partner.city, partner.region].filter(Boolean).join(', ') || '—'}
              />
              {partner.referral_code && <Row label="Referral Code" value={partner.referral_code} />}
            </dl>
          </section>

          {/* Same unified layout as the retail order payment panel (CLAUDE.md §9) - package
              payment reuses the manual-payment proof shape 1:1. */}
          <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
            <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
              Package & Payment
            </h2>
            {partner.package ? (
              <>
                <dl className="tabular mt-3 space-y-1.5 text-sm">
                  <Row label="Package" value={`${partner.package} (${partner.package_boxes} boxes)`} />
                  <Row label="Package Amount" value={formatPHP(partner.package_amount)} />
                  <Row
                    label="Method"
                    value={partner.payment_method ? (METHOD_LABELS[partner.payment_method] ?? partner.payment_method) : '—'}
                  />
                  <Row
                    label="Payment Status"
                    value={`${PAYMENT_STATUS_EMOJI[partner.payment_status]} ${PAYMENT_STATUS_LABELS[partner.payment_status]}`}
                  />
                  {partner.payment_reference && <Row label="Reference" value={partner.payment_reference} />}
                  {partner.payment_amount != null && (
                    <Row label="Amount Paid" value={formatPHP(partner.payment_amount)} />
                  )}
                  {partner.payment_date && <Row label="Payment Date" value={partner.payment_date} />}
                </dl>

                {proofUrl ? (
                  <a href={proofUrl} target="_blank" rel="noreferrer" className="mt-4 block">
                    <img
                      src={proofUrl}
                      alt="Payment proof"
                      className="max-h-64 rounded-sm border border-white/10"
                    />
                  </a>
                ) : (
                  <p className="mt-4 text-xs text-lf-cream/50">No proof of payment on file.</p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-lf-cream/50">
                Applicant hasn't submitted their package payment yet.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
            <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Decision</h2>

            {!canDecide && (
              <p className="mt-3 text-sm text-lf-cream/60">
                This application has already been {partner.status === 'active' ? 'approved' : partner.status}.
              </p>
            )}

            {canDecide && (
              <>
                <p className="mt-2 text-sm text-lf-cream/70">
                  Approving verifies the package payment and activates the partner, generating their
                  referral code.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy || !partner.package}
                    onClick={handleApprove}
                    className="btn-gold !px-5 !py-2.5 !text-sm disabled:opacity-50"
                    title={!partner.package ? 'Waiting on package payment' : undefined}
                  >
                    Approve Partner
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleReject}
                    className="btn-outline !border-lf-error !px-5 !py-2.5 !text-sm !text-lf-error hover:!bg-lf-error hover:!text-lf-black disabled:opacity-50"
                  >
                    Reject Application
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-lf-cream/60">{label}</dt>
      <dd className="text-right text-lf-white">{value}</dd>
    </div>
  );
}
