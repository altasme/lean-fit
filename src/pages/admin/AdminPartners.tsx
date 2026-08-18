import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { listPartners } from '../../lib/adminPartners';
import type { Partner } from '../../types/partner';
import { PARTNER_STATUS_LABELS, partnerTypeLabel } from '../../types/partner';
import type { PartnerType } from '../../types/partner';
import { PAYMENT_STATUS_EMOJI, PAYMENT_STATUS_LABELS } from '../../types/payment';
import { formatPHP } from '../../lib/format';

const STATUS_EMOJI = { pending: '🟡', active: '🟢', suspended: '🟠', rejected: '🔴' } as const;

// Item #2's three admin-facing buckets - Pending (new leads + applications
// awaiting onboarding), Active, and Inactive/Suspended (suspended and
// rejected grouped together - both mean "not currently a live partner").
type Tab = 'pending' | 'active' | 'inactive';
const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'Pending Partners' },
  { key: 'active', label: 'Active Partners' },
  { key: 'inactive', label: 'Inactive / Suspended' },
];

function matchesTab(p: Partner, tab: Tab): boolean {
  if (tab === 'pending') return p.status === 'pending';
  if (tab === 'active') return p.status === 'active';
  return p.status === 'suspended' || p.status === 'rejected';
}

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('pending');
  const [type, setType] = useState<PartnerType | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    listPartners()
      .then(setPartners)
      .catch((err) => setError(err.message));
  }, []);

  const counts = useMemo(() => {
    if (!partners) return { pending: 0, active: 0, inactive: 0 };
    return {
      pending: partners.filter((p) => matchesTab(p, 'pending')).length,
      active: partners.filter((p) => matchesTab(p, 'active')).length,
      inactive: partners.filter((p) => matchesTab(p, 'inactive')).length,
    };
  }, [partners]);

  const filtered = useMemo(() => {
    if (!partners) return [];
    const term = search.trim().toLowerCase();
    return partners.filter((p) => {
      if (!matchesTab(p, tab)) return false;
      if (type !== 'all' && p.partner_type !== type) return false;
      if (term) {
        const haystack = `${p.full_name} ${p.email} ${p.mobile}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [partners, tab, type, search]);

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Partners</h1>
        <Link to="/admin/partners/new" className="btn-gold !px-5 !py-2.5 !text-sm">
          + Add Partner
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}
      {!partners && !error && <p className="mt-4 text-sm text-lf-cream/60">Loading partners…</p>}

      {partners && (
        <>
          <div className="mt-6 flex gap-1 border-b border-white/10">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`border-b-2 px-4 py-3 font-kicker text-xs uppercase tracking-wide2 transition-colors ${
                  tab === t.key
                    ? 'border-lf-gold text-lf-gold'
                    : 'border-transparent text-lf-cream/60 hover:text-lf-cream'
                }`}
              >
                {t.label} <span className="tabular text-lf-cream/40">({counts[t.key]})</span>
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="block font-kicker text-xs uppercase tracking-wide2 text-lf-cream/60">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email, mobile"
                className="mt-1 w-full rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-kicker text-xs uppercase tracking-wide2 text-lf-cream/60">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PartnerType | 'all')}
                className="mt-1 rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
              >
                <option value="all">All</option>
                <option value="franchise">Franchise</option>
                <option value="distributor">Distributor</option>
                <option value="reseller">Reseller</option>
              </select>
            </div>
          </div>

          <p className="mt-4 text-xs text-lf-cream/50">
            {filtered.length} partner{filtered.length === 1 ? '' : 's'}
          </p>

          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-lf-cream/60">
              {tab === 'pending'
                ? "No pending leads or applications right now."
                : 'No partners match these filters.'}
            </p>
          ) : (
            <div className="tabular mt-2 overflow-x-auto rounded-sm border border-white/10">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-lf-charcoal text-xs uppercase tracking-wide2 text-lf-cream/60">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Package</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <Link to={`/admin/partners/${p.id}`} className="text-lf-gold hover:underline">
                          {p.full_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-lf-cream/70">{partnerTypeLabel(p.partner_type)}</td>
                      <td className="px-4 py-3 text-lf-cream/70">
                        {[p.city, p.province ?? p.region].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-lf-white">
                        {p.package ? `${p.package} (${formatPHP(p.package_amount)})` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="whitespace-nowrap">
                          {PAYMENT_STATUS_EMOJI[p.payment_status]} {PAYMENT_STATUS_LABELS[p.payment_status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="whitespace-nowrap">
                          {STATUS_EMOJI[p.status]} {PARTNER_STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-lf-cream/60">
                        {new Date(p.created_at).toLocaleDateString('en-PH')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
