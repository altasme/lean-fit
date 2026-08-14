import { formatPHP } from '../../lib/format';
import type { OrderWithPayment } from '../../lib/adminOrders';

export function OrderStats({ orders }: { orders: OrderWithPayment[] }) {
  const pendingVerification = orders.filter(
    (o) => o.payment?.status === 'pending_verification',
  ).length;

  const codOutstanding = orders.filter(
    (o) => o.payment?.method === 'cod' && o.payment.status !== 'paid',
  ).length;

  const totalRevenue = orders
    .filter((o) => o.payment?.status === 'paid')
    .reduce((sum, o) => sum + o.total, 0);

  const stats = [
    { label: 'Total Orders', value: orders.length.toLocaleString('en-PH') },
    { label: 'Pending Verification', value: pendingVerification.toLocaleString('en-PH') },
    { label: 'COD Outstanding', value: codOutstanding.toLocaleString('en-PH') },
    { label: 'Revenue (Paid)', value: formatPHP(totalRevenue) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-sm border border-white/10 bg-lf-charcoal p-4">
          <p className="font-kicker text-xs uppercase tracking-wide2 text-lf-cream/60">
            {stat.label}
          </p>
          <p className="tabular mt-1.5 font-display text-2xl text-lf-gold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
