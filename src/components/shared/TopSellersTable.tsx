import { useEffect, useMemo, useState } from 'react';
import { formatPHP } from '../../lib/format';
import { fetchTopSellers } from '../../lib/topSellers';
import type { TopSeller } from '../../lib/topSellers';
import { partnerTypeLabel } from '../../types/partner';

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

function recentMonthKeys(count: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}

const ALL_TIME = 'all';

/**
 * Top-20-by-online-sales leaderboard (client spec items #3/#4), shared
 * verbatim between the partner portal's "Top Seller Rankings" tab
 * (reseller/tabs/TopSellersTab.tsx) and admin's "Top Sellers" page
 * (pages/admin/AdminTopSellers.tsx) - same query, same layout, only the
 * page around it differs. `highlightPartnerId` (partner view only) marks
 * the signed-in partner's own row if they place in the top 20.
 */
export function TopSellersTable({ highlightPartnerId }: { highlightPartnerId?: string }) {
  const [month, setMonth] = useState(ALL_TIME);
  const [rows, setRows] = useState<TopSeller[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const months = useMemo(() => recentMonthKeys(12), []);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    fetchTopSellers(month === ALL_TIME ? undefined : `${month}-01`)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load rankings.');
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  return (
    <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Top Seller Rankings</h2>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-sm border border-white/15 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
        >
          <option value={ALL_TIME}>All Time</option>
          {months.map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}
      {!rows && !error && <p className="mt-4 text-sm text-lf-cream/60">Loading…</p>}

      {rows && rows.length === 0 && (
        <p className="mt-4 text-sm text-lf-cream/60">No online sales recorded for this period yet.</p>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="tabular w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide2 text-lf-cream/50">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Online Sales</th>
                <th className="px-4 py-3">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isSelf = row.partner_id === highlightPartnerId;
                return (
                  <tr
                    key={row.partner_id}
                    className={`border-b border-white/5 last:border-0 ${isSelf ? 'bg-lf-gold/10' : ''}`}
                  >
                    <td className="px-4 py-3 text-lf-cream/60">{i + 1}</td>
                    <td className="px-4 py-3 text-lf-white">
                      {row.full_name}
                      {isSelf && (
                        <span className="ml-2 text-xs uppercase tracking-wide2 text-lf-gold">You</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-lf-cream/70">{partnerTypeLabel(row.partner_type)}</td>
                    <td className="px-4 py-3 text-lf-white">{formatPHP(row.online_sales)}</td>
                    <td className="px-4 py-3 text-lf-gold">{formatPHP(row.earnings)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
