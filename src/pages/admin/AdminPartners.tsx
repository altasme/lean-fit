import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { listPartners } from '../../lib/adminPartners';
import type { Partner } from '../../types/partner';
import { PARTNER_STATUS_LABELS, PARTNER_TYPE_LABELS } from '../../types/partner';
import type { PartnerStatus, PartnerType } from '../../types/partner';
import { PAYMENT_STATUS_EMOJI, PAYMENT_STATUS_LABELS } from '../../types/payment';
import { formatPHP } from '../../lib/format';

const STATUS_EMOJI: Record<PartnerStatus, string> = {
  pending: '🟡',
  active: '🟢',
  suspended: '🟠',
  rejected: '🔴',
};

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PartnerStatus | 'all'>('all');
  const [type, setType] = useState<PartnerType | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    listPartners()
      .then(setPartners)
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (!partners) return [];
    const term = search.trim().toLowerCase();
    return partners.filter((p) => {
      if (status !== 'all' && p.status !== status) return false;
      if (type !== 'all' && p.partner_type !== type) return false;
      if (term) {
        const haystack = `${p.full_name} ${p.email} ${p.mobile}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [partners, status, type, search]);

  return (
    <AdminLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Partners</h1>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}
      {!partners && !error && <p className="mt-4 text-sm text-lf-cream/60">Loading partners…</p>}

      {partners && (
        <>
          <div className="mt-6 flex flex-wrap items-end gap-3">
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
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PartnerStatus | 'all')}
                className="mt-1 rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
              >
                <option value="all">All</option>
                {(Object.keys(PARTNER_STATUS_LABELS) as PartnerStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {PARTNER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
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
                {(Object.keys(PARTNER_TYPE_LABELS) as PartnerType[]).map((t) => (
                  <option key={t} value={t}>
                    {PARTNER_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-4 text-xs text-lf-cream/50">
            {filtered.length} partner{filtered.length === 1 ? '' : 's'}
            {filtered.length !== partners.length ? ` (of ${partners.length} total)` : ''}
          </p>

          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-lf-cream/60">No partners match these filters.</p>
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
                    <th className="px-4 py-3">Applied</th>
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
                      <td className="px-4 py-3 text-lf-cream/70">{PARTNER_TYPE_LABELS[p.partner_type]}</td>
                      <td className="px-4 py-3 text-lf-cream/70">
                        {[p.city, p.region].filter(Boolean).join(', ') || '—'}
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
