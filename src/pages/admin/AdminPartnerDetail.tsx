import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  approvePartner,
  getPartner,
  getPartnerProofSignedUrl,
  grantPartnerPortalAccess,
  reactivatePartner,
  rejectPartner,
  suspendPartner,
} from '../../lib/adminPartners';
import { useToast } from '../../components/ui/Toast';
import { formatPHP } from '../../lib/format';
import type { Partner } from '../../types/partner';
import { PARTNER_STATUS_LABELS, partnerTypeLabel } from '../../types/partner';
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
  const [onboardedBy, setOnboardedBy] = useState<Partner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [sendAccessEmail, setSendAccessEmail] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const p = await getPartner(id);
      setPartner(p);
      setProofUrl(p.payment_proof_path ? await getPartnerProofSignedUrl(p.payment_proof_path) : null);
      setOnboardedBy(p.onboarded_by_partner_id ? await getPartner(p.onboarded_by_partner_id) : null);
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
      showToast(`Partner approved - referral code ${referralCode}. Set their portal password below.`);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Approval failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendPortalAccess() {
    if (!partner || accessPassword.length < 8) return;
    setBusy(true);
    try {
      const { error } = await grantPartnerPortalAccess(partner.id, accessPassword, sendAccessEmail);
      if (error) {
        showToast(`Could not set portal access: ${error}`, 'error');
      } else {
        showToast(sendAccessEmail ? 'Portal access set - credentials emailed.' : 'Portal access set.');
        setAccessPassword('');
        setSendAccessEmail(false);
      }
      await load();
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

  async function handleSuspend() {
    if (!partner) return;
    setBusy(true);
    try {
      await suspendPartner(partner.id);
      showToast('Partner suspended.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to suspend partner.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleReactivate() {
    if (!partner) return;
    setBusy(true);
    try {
      await reactivatePartner(partner.id);
      showToast('Partner reactivated.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reactivate partner.', 'error');
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
              <Row label="Type" value={partnerTypeLabel(partner.partner_type)} />
              <Row label="Email" value={partner.email} />
              <Row label="Mobile" value={partner.mobile} />
              <Row label="Address" value={partner.address ?? '—'} />
              <Row
                label="Location"
                value={
                  [partner.barangay, partner.city, partner.region].filter(Boolean).join(', ') ||
                  [partner.city, partner.province].filter(Boolean).join(', ') ||
                  '—'
                }
              />
              {partner.referral_code && <Row label="Referral Code" value={partner.referral_code} />}
              <Row
                label="Onboarded By"
                value={onboardedBy ? `${onboardedBy.full_name} (${partnerTypeLabel(onboardedBy.partner_type)})` : 'Direct application'}
              />
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

            {partner.status === 'active' && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-wide2 text-lf-cream/50">Portal Access</p>
                <p className="mt-1.5 text-sm text-lf-cream/70">
                  {partner.user_id
                    ? 'This partner has a portal login. Set a new password below to reset it.'
                    : "This partner hasn't set up their portal login yet."}
                </p>
                <div className="mt-3">
                  <input
                    value={accessPassword}
                    onChange={(e) => setAccessPassword(e.target.value)}
                    placeholder="Type a password (min. 8 characters)"
                    className="w-64 rounded-sm border border-white/15 bg-lf-black px-3 py-2 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none"
                    aria-label="Portal access password"
                  />
                </div>
                <p className="mt-1 text-xs text-lf-cream/40">Login email: {partner.email}</p>
                <label className="mt-3 flex items-center gap-2 text-sm text-lf-cream/80">
                  <input
                    type="checkbox"
                    checked={sendAccessEmail}
                    onChange={(e) => setSendAccessEmail(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-white/20 bg-lf-black accent-lf-gold"
                  />
                  Also email these credentials to the partner now
                </label>
                <button
                  type="button"
                  disabled={busy || accessPassword.length < 8}
                  onClick={handleSendPortalAccess}
                  className="btn-outline mt-3 !px-5 !py-2.5 !text-sm disabled:opacity-50"
                >
                  Set Portal Access
                </button>
              </div>
            )}

            {canDecide && !partner.partner_type && (
              <>
                <p className="mt-2 text-sm text-lf-cream/70">
                  This is a lead from the public form - no type, territory, or package yet. Call
                  them, then complete their onboarding here.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to={`/admin/partners/new?leadId=${partner.id}`}
                    className="btn-gold !px-5 !py-2.5 !text-sm"
                  >
                    Complete Onboarding
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleReject}
                    className="btn-outline !border-lf-error !px-5 !py-2.5 !text-sm !text-lf-error hover:!bg-lf-error hover:!text-lf-black disabled:opacity-50"
                  >
                    Reject Lead
                  </button>
                </div>
              </>
            )}

            {canDecide && partner.partner_type && (
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

          {(partner.status === 'active' || partner.status === 'suspended') && (
            <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
              <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Status</h2>
              {partner.status === 'active' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSuspend}
                  className="btn-outline mt-3 !border-lf-error !px-5 !py-2.5 !text-sm !text-lf-error hover:!bg-lf-error hover:!text-lf-black disabled:opacity-50"
                >
                  Suspend Partner
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleReactivate}
                  className="btn-gold mt-3 !px-5 !py-2.5 !text-sm disabled:opacity-50"
                >
                  Reactivate Partner
                </button>
              )}
            </section>
          )}
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
