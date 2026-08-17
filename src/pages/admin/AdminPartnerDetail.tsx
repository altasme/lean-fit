import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  approvePartner,
  assignParentPartner,
  assignPartnerTerritory,
  fetchEligibleParentPartners,
  getPartner,
  getPartnerProofSignedUrl,
  invitePartnerToPortal,
  reactivatePartner,
  rejectPartner,
  suspendPartner,
} from '../../lib/adminPartners';
import { listTerritories } from '../../lib/adminTerritories';
import type { TerritoryWithOccupancy } from '../../lib/adminTerritories';
import { useToast } from '../../components/ui/Toast';
import { formatPHP } from '../../lib/format';
import type { Partner } from '../../types/partner';
import { PARTNER_STATUS_LABELS, PARTNER_TYPE_LABELS } from '../../types/partner';
import { PAYMENT_STATUS_EMOJI, PAYMENT_STATUS_LABELS } from '../../types/payment';
import { PARTNER_TYPE_TERRITORY_LEVEL, TERRITORY_LEVEL_LABELS } from '../../types/territory';

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
  const [eligibleTerritories, setEligibleTerritories] = useState<TerritoryWithOccupancy[]>([]);
  const [eligibleParents, setEligibleParents] = useState<Partner[]>([]);
  const [territorySelection, setTerritorySelection] = useState('');
  const [parentSelection, setParentSelection] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const p = await getPartner(id);
      setPartner(p);
      setProofUrl(p.payment_proof_path ? await getPartnerProofSignedUrl(p.payment_proof_path) : null);

      const level = PARTNER_TYPE_TERRITORY_LEVEL[p.partner_type];
      const [territories, parents] = await Promise.all([
        listTerritories(),
        fetchEligibleParentPartners(p.partner_type),
      ]);
      setEligibleTerritories(territories.filter((t) => t.level === level));
      setEligibleParents(parents.filter((parent) => parent.id !== p.id));
      setTerritorySelection(p.territory_id ?? '');
      setParentSelection(p.parent_partner_id ?? '');
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
      const { referralCode, inviteError } = await approvePartner(partner.id);
      if (inviteError) {
        showToast(
          `Partner approved - referral code ${referralCode}. Portal invite failed: ${inviteError}`,
          'error',
        );
      } else {
        showToast(`Partner approved - referral code ${referralCode}. Portal invite sent.`);
      }
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Approval failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleResendInvite() {
    if (!partner) return;
    setBusy(true);
    try {
      const { error } = await invitePartnerToPortal(partner.id);
      if (error) {
        showToast(`Could not send portal invite: ${error}`, 'error');
      } else {
        showToast(
          partner.user_id
            ? 'Password reset email sent to the partner.'
            : 'Portal invite sent to the partner.',
        );
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

  async function handleAssignTerritory() {
    if (!partner || !territorySelection) return;
    setBusy(true);
    try {
      await assignPartnerTerritory(partner.id, territorySelection);
      showToast('Territory assigned.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to assign territory.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignParent() {
    if (!partner) return;
    setBusy(true);
    try {
      await assignParentPartner(partner.id, parentSelection || null);
      showToast(parentSelection ? 'Parent partner assigned.' : 'Parent partner cleared.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to assign parent partner.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSuspend() {
    if (!partner) return;
    setBusy(true);
    try {
      await suspendPartner(partner.id);
      showToast('Partner suspended - their territory slot is now available for reassignment.');
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

            {partner.status === 'active' && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-wide2 text-lf-cream/50">Portal Access</p>
                <p className="mt-1.5 text-sm text-lf-cream/70">
                  {partner.user_id
                    ? 'This partner has a portal login.'
                    : "This partner hasn't set up their portal login yet."}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleResendInvite}
                  className="btn-outline mt-3 !px-5 !py-2.5 !text-sm disabled:opacity-50"
                >
                  {partner.user_id ? 'Resend Password Reset' : 'Resend Portal Invite'}
                </button>
              </div>
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

          {(partner.status === 'active' || partner.status === 'suspended') && (
            <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
              <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
                Territory &amp; Hierarchy
              </h2>

              <div className="mt-3">
                <p className="text-xs uppercase tracking-wide2 text-lf-cream/50">
                  {TERRITORY_LEVEL_LABELS[PARTNER_TYPE_TERRITORY_LEVEL[partner.partner_type]]}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <select
                    value={territorySelection}
                    onChange={(e) => setTerritorySelection(e.target.value)}
                    className="rounded-sm border border-white/15 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {eligibleTerritories.map((t) => {
                      const full = t.capacity != null && t.occupiedCount >= t.capacity && t.id !== partner.territory_id;
                      return (
                        <option key={t.id} value={t.id} disabled={full}>
                          {t.name} ({t.occupiedCount}
                          {t.capacity != null ? `/${t.capacity}` : ''}
                          {full ? ' - Full' : ''})
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !territorySelection || territorySelection === partner.territory_id}
                    onClick={handleAssignTerritory}
                    className="btn-outline !px-4 !py-2 !text-sm disabled:opacity-50"
                  >
                    {partner.territory_id ? 'Change' : 'Assign'}
                  </button>
                </div>
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-wide2 text-lf-cream/50">Parent Partner</p>
                {eligibleParents.length === 0 ? (
                  <p className="mt-1.5 text-sm text-lf-cream/50">
                    {partner.partner_type === 'franchise'
                      ? 'Franchise partners have no parent - they report to Lean & Fit directly.'
                      : 'No eligible upstream partners exist yet.'}
                  </p>
                ) : (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <select
                      value={parentSelection}
                      onChange={(e) => setParentSelection(e.target.value)}
                      className="rounded-sm border border-white/15 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
                    >
                      <option value="">None (Lean &amp; Fit)</option>
                      {eligibleParents.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} ({PARTNER_TYPE_LABELS[p.partner_type]})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy || parentSelection === (partner.parent_partner_id ?? '')}
                      onClick={handleAssignParent}
                      className="btn-outline !px-4 !py-2 !text-sm disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-wide2 text-lf-cream/50">Status</p>
                {partner.status === 'active' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleSuspend}
                    className="btn-outline mt-2 !border-lf-error !px-5 !py-2.5 !text-sm !text-lf-error hover:!bg-lf-error hover:!text-lf-black disabled:opacity-50"
                  >
                    Suspend Partner
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleReactivate}
                    className="btn-gold mt-2 !px-5 !py-2.5 !text-sm disabled:opacity-50"
                  >
                    Reactivate Partner
                  </button>
                )}
              </div>
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
