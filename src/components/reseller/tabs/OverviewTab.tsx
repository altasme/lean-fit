import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useToast } from '../../ui/Toast';
import { buildReferralUrl } from '../../../lib/partners';
import { formatPHP } from '../../../lib/format';
import { PARTNER_TYPE_LABELS } from '../../../types/partner';
import type { Partner } from '../../../types/partner';

// Phase D's original dashboard content (referral identity + account
// summary), now the "Overview" tab alongside Phase F's other sections.
// Parent/downstream partner display is new groundwork for spec §46 - both
// will normally be empty until Phase G's admin UI can assign
// parent_partner_id at all.
export function OverviewTab({
  partner,
  parentPartner,
  downstreamPartners,
}: {
  partner: Partner;
  parentPartner: Partner | null;
  downstreamPartners: Partner[];
}) {
  const { showToast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const referralUrl = partner.referral_code ? buildReferralUrl(partner.referral_code) : null;

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

  async function handleCopy() {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      showToast('Referral link copied.');
    } catch {
      showToast('Could not copy - copy it manually instead.', 'error');
    }
  }

  return (
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
              <dd className="text-lf-white">{PARTNER_TYPE_LABELS[partner.partner_type]}</dd>
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
                  ? `${parentPartner.full_name} (${PARTNER_TYPE_LABELS[parentPartner.partner_type]})`
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
                    {PARTNER_TYPE_LABELS[p.partner_type]}
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
  );
}
