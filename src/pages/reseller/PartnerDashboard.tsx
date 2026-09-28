import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PartnerLayout } from '../../components/reseller/PartnerLayout';
import { checkGanapStatus } from '../../lib/ganap';
import { usePartnerAuth } from '../../components/reseller/PartnerAuthProvider';
import { OverviewTab } from '../../components/reseller/tabs/OverviewTab';
import { TopSellersTab } from '../../components/reseller/tabs/TopSellersTab';
import { ClientOrdersTab } from '../../components/reseller/tabs/ClientOrdersTab';
import { MyOrdersTab } from '../../components/reseller/tabs/MyOrdersTab';
import { CustomersTab } from '../../components/reseller/tabs/CustomersTab';
import { CommissionTab } from '../../components/reseller/tabs/CommissionTab';
import { MarketingMaterialsTab } from '../../components/reseller/tabs/MarketingMaterialsTab';
import { fetchDownstreamPartners, fetchParentPartner } from '../../lib/partners';
import {
  fetchPartnerVisibleOrders,
  splitPartnerOrders,
  summarizePartnerCustomers,
  summarizePartnerEarnings,
} from '../../lib/partnerOrders';
import type { PartnerOrder } from '../../lib/partnerOrders';
import { partnerTypeLabel } from '../../types/partner';
import type { Partner } from '../../types/partner';

// Spec §40's dashboard menu: Client Orders / My Orders / Customers /
// Commission / Marketing Materials, plus an Overview tab carrying Phase
// D's referral identity content. One page, tab-switched client-side
// (matches the rest of this codebase's single-page-with-sections style -
// e.g. checkout - rather than five separate routes for what's currently a
// read-only dashboard with no per-section deep-linking need yet).
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'top-sellers', label: 'Top Sellers' },
  { key: 'client-orders', label: 'Client Orders' },
  { key: 'my-orders', label: 'My Orders' },
  { key: 'customers', label: 'Customers' },
  { key: 'commission', label: 'Commission' },
  { key: 'marketing', label: 'Marketing Materials' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

type GatewayReturn = { orderNo: string; orderId: string };
type GatewayStatus = 'pending' | 'paid' | 'failed' | 'expired';

/** How long to poll Ganap for a settled status before leaving it to the webhook - matches OrderConfirmed.tsx's retail equivalent. */
const GATEWAY_POLL_ATTEMPTS = 5;
const GATEWAY_POLL_INTERVAL_MS = 3000;

export default function PartnerDashboard() {
  const { partner } = usePartnerAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>('overview');

  const [orders, setOrders] = useState<PartnerOrder[] | null>(null);
  const [parentPartner, setParentPartner] = useState<Partner | null>(null);
  const [downstreamPartners, setDownstreamPartners] = useState<Partner[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Client request: switch partner self-ordering's payment to the Ganap
  // gateway (migration 0031) - Ganap's redirect back after checkout is a
  // real, top-level, cross-domain navigation (browser left for Ganap's
  // hosted page and comes back via successRedirectUrl), so this reads the
  // order back from URL query params the same way OrderConfirmed.tsx does
  // for retail, then polls for settlement since the webhook may not have
  // landed yet.
  const [gatewayReturn, setGatewayReturn] = useState<GatewayReturn | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>('pending');
  const gatewayPollAttempts = useRef(0);

  useEffect(() => {
    const orderNo = searchParams.get('order_no');
    const orderId = searchParams.get('order_id');
    if (searchParams.get('gateway') !== '1' || !orderNo || !orderId) return;

    setGatewayReturn({ orderNo, orderId });
    setTab('my-orders');
    // Strip the query params so a refresh doesn't re-trigger this or re-poll.
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!partner) return;
    try {
      const [o, parent, downstream] = await Promise.all([
        fetchPartnerVisibleOrders(),
        partner.parent_partner_id ? fetchParentPartner(partner.parent_partner_id) : Promise.resolve(null),
        fetchDownstreamPartners(partner.id),
      ]);
      setOrders(o);
      setParentPartner(parent);
      setDownstreamPartners(downstream);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    }
  }, [partner]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!gatewayReturn || gatewayStatus !== 'pending') return;

    const interval = setInterval(async () => {
      gatewayPollAttempts.current += 1;
      try {
        const { status, paid } = await checkGanapStatus(gatewayReturn.orderId);
        if (paid) {
          setGatewayStatus('paid');
          clearInterval(interval);
          void load();
        } else if (status === 'failed' || status === 'expired') {
          setGatewayStatus(status);
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Ganap status check failed:', err);
      }
      if (gatewayPollAttempts.current >= GATEWAY_POLL_ATTEMPTS) clearInterval(interval);
    }, GATEWAY_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [gatewayReturn, gatewayStatus, load]);

  if (!partner) return null; // RequirePartnerAuth guarantees this never renders without a partner

  const { clientOrders, myOrders } = orders
    ? splitPartnerOrders(orders, partner.id, partner.email)
    : { clientOrders: [], myOrders: [] };
  const customers = summarizePartnerCustomers(clientOrders);
  const earnings = summarizePartnerEarnings(clientOrders);

  return (
    <PartnerLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">
        Welcome, {partner.full_name}
      </h1>
      <p className="mt-1 text-sm text-lf-cream/60">
        {partnerTypeLabel(partner.partner_type)} Partner
        {partner.city ? ` · ${[partner.barangay, partner.city, partner.region].filter(Boolean).join(', ')}` : ''}
      </p>

      {gatewayReturn && (
        <div
          className={`mt-6 rounded-sm border p-4 text-sm ${
            gatewayStatus === 'paid'
              ? 'border-lf-success/40 bg-lf-success/10 text-lf-cream/90'
              : gatewayStatus === 'failed' || gatewayStatus === 'expired'
                ? 'border-lf-error/40 bg-lf-error/10 text-lf-cream/90'
                : 'border-lf-gold/40 bg-lf-gold/10 text-lf-cream/90'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p>
              {gatewayStatus === 'paid' ? (
                <>
                  🟢 Payment verified for order <strong>#{gatewayReturn.orderNo}</strong> - we'll pack it
                  shortly.
                </>
              ) : gatewayStatus === 'failed' || gatewayStatus === 'expired' ? (
                <>
                  🔴 We couldn't confirm payment for order <strong>#{gatewayReturn.orderNo}</strong>. If
                  you were charged, contact us - otherwise place the order again.
                </>
              ) : (
                <>
                  🟡 Confirming payment for order <strong>#{gatewayReturn.orderNo}</strong> with our
                  payment partner - this usually takes just a few seconds.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setGatewayReturn(null)}
              className="shrink-0 text-xs text-lf-cream/50 hover:text-lf-cream"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-sm px-3 py-2 font-kicker text-xs uppercase tracking-wide2 transition-colors ${
              tab === t.key
                ? 'bg-lf-gold text-lf-black'
                : 'text-lf-cream/70 hover:bg-lf-charcoal hover:text-lf-gold'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {error && (
          <p className="mb-4 rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
            {error}
          </p>
        )}

        {!orders && !error && <p className="text-sm text-lf-cream/60">Loading…</p>}

        {orders && (
          <>
            {tab === 'overview' && (
              <OverviewTab
                partner={partner}
                parentPartner={parentPartner}
                downstreamPartners={downstreamPartners}
                clientOrders={clientOrders}
              />
            )}
            {tab === 'top-sellers' && <TopSellersTab partner={partner} />}
            {tab === 'client-orders' && <ClientOrdersTab orders={clientOrders} />}
            {tab === 'my-orders' && (
              <MyOrdersTab orders={myOrders} partner={partner} onOrderPlaced={() => void load()} />
            )}
            {tab === 'customers' && <CustomersTab customers={customers} />}
            {tab === 'commission' && <CommissionTab summary={earnings} />}
            {tab === 'marketing' && <MarketingMaterialsTab />}
          </>
        )}
      </div>
    </PartnerLayout>
  );
}
