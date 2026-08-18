import { useEffect, useState } from 'react';
import { PartnerLayout } from '../../components/reseller/PartnerLayout';
import { usePartnerAuth } from '../../components/reseller/PartnerAuthProvider';
import { OverviewTab } from '../../components/reseller/tabs/OverviewTab';
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
  { key: 'client-orders', label: 'Client Orders' },
  { key: 'my-orders', label: 'My Orders' },
  { key: 'customers', label: 'Customers' },
  { key: 'commission', label: 'Commission' },
  { key: 'marketing', label: 'Marketing Materials' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function PartnerDashboard() {
  const { partner } = usePartnerAuth();
  const [tab, setTab] = useState<TabKey>('overview');

  const [orders, setOrders] = useState<PartnerOrder[] | null>(null);
  const [parentPartner, setParentPartner] = useState<Partner | null>(null);
  const [downstreamPartners, setDownstreamPartners] = useState<Partner[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partner) return;
    let cancelled = false;

    Promise.all([
      fetchPartnerVisibleOrders(),
      partner.parent_partner_id ? fetchParentPartner(partner.parent_partner_id) : Promise.resolve(null),
      fetchDownstreamPartners(partner.id),
    ])
      .then(([o, parent, downstream]) => {
        if (cancelled) return;
        setOrders(o);
        setParentPartner(parent);
        setDownstreamPartners(downstream);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
      });

    return () => {
      cancelled = true;
    };
  }, [partner]);

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
              />
            )}
            {tab === 'client-orders' && <ClientOrdersTab orders={clientOrders} />}
            {tab === 'my-orders' && <MyOrdersTab orders={myOrders} />}
            {tab === 'customers' && <CustomersTab customers={customers} />}
            {tab === 'commission' && <CommissionTab summary={earnings} />}
            {tab === 'marketing' && <MarketingMaterialsTab />}
          </>
        )}
      </div>
    </PartnerLayout>
  );
}
