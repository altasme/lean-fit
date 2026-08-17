import { formatPHP } from '../../../lib/format';
import type { EarningsStatus, EarningsSummary } from '../../../lib/partnerOrders';

const STATUS_LABELS: Record<EarningsStatus, string> = {
  payable: 'Payable',
  pending: 'Pending',
  void: 'Void',
};

const STATUS_COLORS: Record<EarningsStatus, string> = {
  payable: 'text-lf-success',
  pending: 'text-lf-gold',
  void: 'text-lf-cream/40',
};

// Spec §44 "Commission / Earnings." "Payable" here means the underlying
// order's payment has cleared and the earning is ready for Lean & Fit's
// external payout process (CLAUDE.md §13 - no automated payouts/refunds
// are built) - it does not mean the partner has been paid out yet. There
// is no separate "Paid" state to track that without a payout table this
// phase deliberately doesn't add.
export function CommissionTab({ summary }: { summary: EarningsSummary }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Total Earnings" value={summary.total} accent="text-lf-white" />
        <Tile label="Payable" value={summary.payable} accent="text-lf-success" />
        <Tile label="Pending" value={summary.pending} accent="text-lf-gold" />
      </div>

      {summary.entries.length === 0 ? (
        <section className="rounded-sm border border-white/10 bg-lf-charcoal p-6">
          <p className="text-sm text-lf-cream/60">No earnings yet - they'll appear here once a customer orders through your referral link.</p>
        </section>
      ) : (
        <section className="overflow-x-auto rounded-sm border border-white/10 bg-lf-charcoal">
          <table className="tabular w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide2 text-lf-cream/50">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Sale Amount</th>
                <th className="px-4 py-3">Earnings</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.entries.map(({ order, status, amount }) => (
                <tr key={order.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-lf-white">{order.order_no}</td>
                  <td className="px-4 py-3 text-lf-cream/80">{formatPHP(order.total)}</td>
                  <td className="px-4 py-3 text-lf-white">{formatPHP(amount)}</td>
                  <td className={`px-4 py-3 ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-sm border border-white/10 bg-lf-charcoal p-5">
      <p className="text-xs uppercase tracking-wide2 text-lf-cream/50">{label}</p>
      <p className={`tabular mt-2 text-2xl font-semibold ${accent}`}>{formatPHP(value)}</p>
    </div>
  );
}
