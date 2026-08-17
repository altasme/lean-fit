import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { PartnerLayout } from '../../components/reseller/PartnerLayout';
import { usePartnerAuth } from '../../components/reseller/PartnerAuthProvider';
import { useToast } from '../../components/ui/Toast';
import { buildReferralUrl } from '../../lib/partners';
import { formatPHP } from '../../lib/format';
import { PARTNER_TYPE_LABELS } from '../../types/partner';

// Phase D scope: referral identity (code/URL/QR) + account summary only.
// Orders, earnings, and downline (spec §40's full dashboard) are Phase F.
export default function PartnerDashboard() {
  const { partner } = usePartnerAuth();
  const { showToast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const referralUrl = partner?.referral_code ? buildReferralUrl(partner.referral_code) : null;

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

  if (!partner) return null; // RequirePartnerAuth guarantees this never renders without a partner

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
    <PartnerLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">
        Welcome, {partner.full_name}
      </h1>
      <p className="mt-1 text-sm text-lf-cream/60">
        {PARTNER_TYPE_LABELS[partner.partner_type]} Partner
        {partner.city ? ` · ${[partner.barangay, partner.city, partner.region].filter(Boolean).join(', ')}` : ''}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
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
      </div>

      <p className="mt-8 text-xs text-lf-cream/40">
        Order tracking, earnings, and your downline are coming soon to this dashboard.
      </p>
    </PartnerLayout>
  );
}
