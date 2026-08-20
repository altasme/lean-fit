import { useMemo, useState } from 'react';
import { formatPHP } from '../../../lib/format';
import { summarizePartnerSalesByMonth } from '../../../lib/partnerOrders';
import type { PartnerOrder } from '../../../lib/partnerOrders';

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

/**
 * Overview's "Total Online Sales" / "Total Earnings" cards, filterable
 * per month (client request). Sourced from Client Orders (referred-
 * customer sales) - see lib/partnerOrders.ts summarizePartnerSalesByMonth
 * for what counts as an "online sale" here (a paid, non-cancelled,
 * non-returned order).
 */
export function SalesOverviewCards({ clientOrders }: { clientOrders: PartnerOrder[] }) {
  const byMonth = useMemo(() => summarizePartnerSalesByMonth(clientOrders), [clientOrders]);

  const months = useMemo(() => {
    const keys = new Set(byMonth.keys());
    keys.add(currentMonthKey());
    return Array.from(keys).sort().reverse();
  }, [byMonth]);

  const [selected, setSelected] = useState(currentMonthKey());
  const activeKey = months.includes(selected) ? selected : months[0];
  const data = byMonth.get(activeKey) ?? { onlineSales: 0, earnings: 0, orderCount: 0 };

  return (
    <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Online Sales</h2>
        <select
          value={activeKey}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-sm border border-white/15 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
        >
          {months.map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-sm border border-white/10 bg-lf-black p-5">
          <p className="text-xs uppercase tracking-wide2 text-lf-cream/50">Total Online Sales</p>
          <p className="tabular mt-2 text-2xl font-semibold text-lf-white">{formatPHP(data.onlineSales)}</p>
          <p className="mt-1 text-xs text-lf-cream/40">
            {data.orderCount} order{data.orderCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="rounded-sm border border-white/10 bg-lf-black p-5">
          <p className="text-xs uppercase tracking-wide2 text-lf-cream/50">Total Earnings</p>
          <p className="tabular mt-2 text-2xl font-semibold text-lf-gold">{formatPHP(data.earnings)}</p>
        </div>
      </div>
    </section>
  );
}
