import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useToast } from '../../ui/Toast';
import { buildInviteUrl, buildReferralUrl } from '../../../lib/partners';
import { formatPHP } from '../../../lib/format';
import { ONBOARDABLE_PARTNER_TYPES, PARTNER_TYPE_LABELS, partnerTypeLabel } from '../../../types/partner';
import type { Partner } from '../../../types/partner';
import { SalesOverviewCards } from './SalesOverviewCards';
import type { PartnerOrder } from '../../../lib/partnerOrders';

// Phase D's original dashboard content (referral identity + account
// summary), now the "Overview" tab alongside Phase F's other sections.
// Parent/downstream partner display (spec §46) is populated by Phase G's
// admin reassignment. Partner-assisted onboarding (Part 2 §1 Route B,
// "+ Add Partner" here) is disabled by client decision - partners can no
// longer onboard other partners, that's admin-only now (migration 0017,
// see pages/reseller/AddPartner.tsx and App.tsx for how it's hidden
// rather than deleted). Parent/downstream display stays since it's
// read-only history, not a new-onboarding capability.
export function OverviewTab({
  partner,
  parentPartner,
  downstreamPartners,
  clientOrders,
}: {
  partner: Partner;
  parentPartner: Partner | null;
  downstreamPartners: Partner[];
  clientOrders: PartnerOrder[];
}) {
  const { showToast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [inviteQrDataUrl, setInviteQrDataUrl] = useState<string | null>(null);

  const referralUrl = partner.referral_code ? buildReferralUrl(partner.referral_code) : null;
  const inviteUrl = partner.invite_code ? buildInviteUrl(partner.invite_code) : null;
  // Client rule: only a Distributor or Franchise can invite (a Reseller
  // has no downline at all), matching ONBOARDABLE_PARTNER_TYPES already
  // used server-side to validate this.
  const canInvite = partner.partner_type ? ONBOARDABLE_PARTNER_TYPES[partner.partner_type].length > 0 : false;
  const invitableTypes = partner.partner_type ? ONBOARDABLE_PARTNER_TYPES[partner.partner_type] : [];

  useEffect(() => {
    if (!referralUrl) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(referralUrl, { margin: 1, width: 240, color: { dark: '#0D0D0D', light: '#F2E9DB' } })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [referralUrl]);

  useEffect(() => {
    if (!inviteUrl) {
      setInviteQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(inviteUrl, { margin: 1, width: 240, color: { dark: '#0D0D0D', light: '#F2E9DB' } })
      .then((url) => {
        if (!cancelled) setInviteQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setInviteQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteUrl]);

  async function handleCopy() {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      showToast('Referral link copied.');
    } catch {
      showToast('Could not copy - copy it manually instead.', 'error');
    }
  }

  async function handleCopyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showToast('Invite link copied.');
    } catch {
      showToast('Could not copy - copy it manually instead.', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <SalesOverviewCards clientOrders={clientOrders} />

      <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
        <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
          Your Referral Identity
        </h2>

        {partner.referral_code ? (
          <>
            <dl className="tabular mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-lf-cream/60">Referral Code</dt>
                <dd className="text-lf-white">{partner.referral_code}</dd>
              </div>
            </dl>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
                Referral URL
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={referralUrl ?? ''}
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
                />
                <button type="button" onClick={handleCopy} className="btn-outline shrink-0 !px-4 !text-sm">
                  Copy
                </button>
              </div>
            </div>

            {qrDataUrl && (
              <div className="mt-5 flex flex-col items-center gap-2 rounded-sm border border-white/10 bg-lf-black p-5">
                <img src={qrDataUrl} alt="Referral QR code" className="h-40 w-40" />
                <p className="text-xs text-lf-cream/50">Scan to open your referral link</p>
              </div>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm text-lf-cream/60">
            Your referral code hasn't been generated yet.
          </p>
        )}
      </section>

      <div className="space-y-6">
        <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
            Account Summary
          </h2>
          <dl className="tabular mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-lf-cream/60">Partner Type</dt>
              <dd className="text-lf-white">{partnerTypeLabel(partner.partner_type)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-lf-cream/60">Status</dt>
              <dd className="text-lf-white capitalize">{partner.status}</dd>
            </div>
            {partner.package && (
              <div className="flex justify-between">
                <dt className="text-lf-cream/60">Package</dt>
                <dd className="text-lf-white">
                  {partner.package} ({partner.package_boxes} boxes)
                </dd>
              </div>
            )}
            {partner.package_amount != null && (
              <div className="flex justify-between">
                <dt className="text-lf-cream/60">Package Amount</dt>
                <dd className="text-lf-white">{formatPHP(partner.package_amount)}</dd>
              </div>
            )}
            {partner.activated_at && (
              <div className="flex justify-between">
                <dt className="text-lf-cream/60">Activated</dt>
                <dd className="text-lf-white">
                  {new Date(partner.activated_at).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
            Partner Network
          </h2>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-lf-cream/60">Parent Partner</dt>
              <dd className="text-right text-lf-white">
                {parentPartner
                  ? `${parentPartner.full_name} (${partnerTypeLabel(parentPartner.partner_type)})`
                  : '—'}
              </dd>
            </div>
          </dl>

          {downstreamPartners.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {downstreamPartners.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm"
                >
                  <span className="text-lf-white">{p.full_name}</span>
                  <span className="text-xs uppercase tracking-wide2 text-lf-cream/50">
                    {partnerTypeLabel(p.partner_type)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-lf-cream/50">No downstream partners yet.</p>
          )}
        </section>
      </div>
      </div>

      {canInvite && (
        <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
            Your Partner Invite Link
          </h2>
          <p className="mt-2 text-sm text-lf-cream/70">
            Share this link to invite new{' '}
            {invitableTypes.map((t) => `${PARTNER_TYPE_LABELS[t]}s`).join(invitableTypes.length > 1 ? ' or ' : '')}
            {' '}- this is different from your Referral URL above, which is for customers buying
            Lean &amp; Fit, not for recruiting other partners. Anyone who signs up through it will
            show you as their upline.
          </p>

          {inviteUrl ? (
            <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
                  Invite URL
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteUrl}
                    onFocus={(e) => e.target.select()}
                    className="w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
                  />
                  <button type="button" onClick={handleCopyInvite} className="btn-outline shrink-0 !px-4 !text-sm">
                    Copy
                  </button>
                </div>
              </div>
              {inviteQrDataUrl && (
                <div className="flex flex-col items-center gap-2 rounded-sm border border-white/10 bg-lf-black p-4">
                  <img src={inviteQrDataUrl} alt="Invite QR code" className="h-32 w-32" />
                  <p className="text-xs text-lf-cream/50">Scan to open</p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-lf-cream/60">Your invite link hasn't been generated yet.</p>
          )}
        </section>
      )}
    </div>
  );
}
