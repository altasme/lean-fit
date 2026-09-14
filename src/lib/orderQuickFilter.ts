import type { OrderWithPayment } from './adminOrders';

// Each order-stats card doubles as a one-click filter for the orders table
// (client request) - 'all' means no quick filter applied (the default, and
// what clicking "Total Orders" or the already-active card resets to).
export type OrderQuickFilter =
  | 'all'
  | 'pending_verification'
  | 'cod_outstanding'
  | 'paid_revenue'
  | 'to_pack'
  | 'to_ship'
  | 'shipped_out'
  | 'delivered';

/** Same predicates the stat cards count by - reused by the orders table so a card's number and its filtered rows always agree. */
export function matchesQuickFilter(order: OrderWithPayment, filter: OrderQuickFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'pending_verification':
      return order.payment?.status === 'pending_verification';
    case 'cod_outstanding':
      return order.payment?.method === 'cod' && order.payment.status !== 'paid';
    case 'paid_revenue':
      return order.payment?.status === 'paid' && order.status !== 'returned';
    case 'to_pack':
      return order.status === 'pending' || order.status === 'confirmed';
    case 'to_ship':
      return order.status === 'packing';
    case 'shipped_out':
      return order.status === 'shipped';
    case 'delivered':
      return order.status === 'completed';
  }
}
