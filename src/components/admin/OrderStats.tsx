import { formatPHP } from '../../lib/format';
import type { OrderWithPayment } from '../../lib/adminOrders';

export function OrderStats({ orders }: { orders: OrderWithPayment[] }) {
  const pendingVerification = orders.filter(
    (o) => o.payment?.status === 'pending_verification',
  ).length;

  const codOutstanding = orders.filter(
    (o) => o.payment?.method === 'cod' && o.payment.status !== 'paid',
  ).length;

  // Returned (RTS) orders never count as revenue, even if their payment
  // was already verified paid before shipping - the sale never actually
  // converted. See lib/adminOrders.ts's markOrderReturned.
  const totalRevenue = orders
    .filter((o) => o.payment?.status === 'paid' && o.status !== 'returned')
    .reduce((sum, o) => sum + o.total, 0);

  const toPack = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length;
  const toShip = orders.filter((o) => o.status === 'packing').length;
  const shippedOut = orders.filter((o) => o.status === 'shipped').length;
  const delivered = orders.filter((o) => o.status === 'completed').length;

  const stats = [
    { label: 'Total Orders', value: orders.length.toLocaleString('en-PH') },
    { label: 'Pending Verification', value: pendingVerification.toLocaleString('en-PH') },
    { label: 'COD Outstanding', value: codOutstanding.toLocaleString('en-PH') },
    { label: 'Revenue (Paid)', value: formatPHP(totalRevenue) },
    { label: 'To Pack', value: toPack.toLocaleString('en-PH') },
    { label: 'To Ship', value: toShip.toLocaleString('en-PH') },
    { label: 'Shipped Out / For Delivery', value: shippedOut.toLocaleString('en-PH') },
    { label: 'Delivered', value: delivered.toLocaleString('en-PH') },
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
