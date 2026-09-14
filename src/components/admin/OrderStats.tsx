import { formatPHP } from '../../lib/format';
import { matchesQuickFilter } from '../../lib/orderQuickFilter';
import type { OrderQuickFilter } from '../../lib/orderQuickFilter';
import type { OrderWithPayment } from '../../lib/adminOrders';

export function OrderStats({
  orders,
  activeFilter,
  onSelectFilter,
}: {
  orders: OrderWithPayment[];
  activeFilter: OrderQuickFilter;
  onSelectFilter: (filter: OrderQuickFilter) => void;
}) {
  const pendingVerification = orders.filter((o) => matchesQuickFilter(o, 'pending_verification')).length;
  const codOutstanding = orders.filter((o) => matchesQuickFilter(o, 'cod_outstanding')).length;
  const totalRevenue = orders
    .filter((o) => matchesQuickFilter(o, 'paid_revenue'))
    .reduce((sum, o) => sum + o.total, 0);
  const toPack = orders.filter((o) => matchesQuickFilter(o, 'to_pack')).length;
  const toShip = orders.filter((o) => matchesQuickFilter(o, 'to_ship')).length;
  const shippedOut = orders.filter((o) => matchesQuickFilter(o, 'shipped_out')).length;
  const delivered = orders.filter((o) => matchesQuickFilter(o, 'delivered')).length;

  const stats: { key: OrderQuickFilter; label: string; value: string }[] = [
    { key: 'all', label: 'Total Orders', value: orders.length.toLocaleString('en-PH') },
    {
      key: 'pending_verification',
      label: 'Pending Verification',
      value: pendingVerification.toLocaleString('en-PH'),
    },
    { key: 'cod_outstanding', label: 'COD Outstanding', value: codOutstanding.toLocaleString('en-PH') },
    { key: 'paid_revenue', label: 'Revenue (Paid)', value: formatPHP(totalRevenue) },
    { key: 'to_pack', label: 'To Pack', value: toPack.toLocaleString('en-PH') },
    { key: 'to_ship', label: 'To Ship', value: toShip.toLocaleString('en-PH') },
    { key: 'shipped_out', label: 'Shipped Out / For Delivery', value: shippedOut.toLocaleString('en-PH') },
    { key: 'delivered', label: 'Delivered', value: delivered.toLocaleString('en-PH') },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => {
        const isActive = activeFilter === stat.key;
        return (
          <button
            key={stat.key}
            type="button"
            onClick={() => onSelectFilter(isActive ? 'all' : stat.key)}
            className={`rounded-sm border p-4 text-left transition-colors ${
              isActive
                ? 'border-lf-gold bg-lf-gold/10'
                : 'border-white/10 bg-lf-charcoal hover:border-lf-gold/40'
            }`}
          >
            <p className="font-kicker text-xs uppercase tracking-wide2 text-lf-cream/60">
              {stat.label}
            </p>
            <p className="tabular mt-1.5 font-display text-2xl text-lf-gold">{stat.value}</p>
          </button>
        );
      })}
    </div>
  );
}
