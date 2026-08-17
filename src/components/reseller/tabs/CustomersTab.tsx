import { formatPHP } from '../../../lib/format';
import type { PartnerCustomer } from '../../../lib/partnerOrders';

// Spec §43 "Customers" - the partner's referred-customer phonebook,
// aggregated from Client Orders. "Referral relationship" is always
// "Direct" for Part 1 - there's no multi-hop referral chain tracked
// (a customer is only ever attributed to the one partner whose link they
// used, see migration 0008).
export function CustomersTab({ customers }: { customers: PartnerCustomer[] }) {
  if (customers.length === 0) {
    return (
      <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
        <p className="text-sm text-lf-cream/60">No customers yet - share your referral link to start.</p>
      </section>
    );
  }

  return (
    <section className="overflow-x-auto rounded-sm border border-white/10 bg-lf-charcoal">
      <table className="tabular w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide2 text-lf-cream/50">
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Orders</th>
            <th className="px-4 py-3">Total Purchased</th>
            <th className="px-4 py-3">Most Recent Order</th>
            <th className="px-4 py-3">Referral</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.email} className="border-b border-white/5 last:border-0">
              <td className="px-4 py-3 text-lf-white">{c.name}</td>
              <td className="px-4 py-3 text-lf-cream/70">
                {c.email}
                <span className="block text-xs text-lf-cream/40">{c.mobile}</span>
              </td>
              <td className="px-4 py-3 text-lf-cream/80">{c.orderCount}</td>
              <td className="px-4 py-3 text-lf-white">{formatPHP(c.totalSpend)}</td>
              <td className="px-4 py-3 text-lf-cream/60">
                {new Date(c.mostRecentOrderAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-lf-cream/60">Direct</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
