import { supabase, uploadPaymentProof } from './supabase';
import type { Order, OrderStatus } from '../types/order';
import type { Payment, PaymentMethodId, PaymentStatus } from '../types/payment';

export type PartnerOrder = Order & { payment: Payment | null };

/**
 * Every order visible to the signed-in partner under RLS (migration
 * 0009): orders they referred, plus orders placed under their own email.
 * No extra filtering here - that split happens client-side in
 * splitPartnerOrders(), same "one fetch, derive views in TS" pattern as
 * fetchActiveProduct().
 */
export async function fetchPartnerVisibleOrders(): Promise<PartnerOrder[]> {
  const [{ data: orders, error: ordersError }, { data: payments, error: paymentsError }] =
    await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('payments').select('*'),
    ]);

  if (ordersError) throw new Error(ordersError.message);
  if (paymentsError) throw new Error(paymentsError.message);

  const paymentByOrderId = new Map((payments as Payment[]).map((p) => [p.order_id, p]));
  return (orders as Order[]).map((order) => ({
    ...order,
    payment: paymentByOrderId.get(order.id) ?? null,
  }));
}

/**
 * Spec §41 vs §42: "Client Orders" (generated through the partner's
 * referral) vs "My Orders" (personally placed by the partner). An order
 * the partner placed through their OWN referral link would otherwise
 * satisfy both - "my own purchase" wins, since it isn't a referred
 * customer.
 */
export function splitPartnerOrders(
  orders: PartnerOrder[],
  partnerId: string,
  partnerEmail: string,
): { clientOrders: PartnerOrder[]; myOrders: PartnerOrder[] } {
  const email = partnerEmail.trim().toLowerCase();
  const myOrders: PartnerOrder[] = [];
  const clientOrders: PartnerOrder[] = [];

  for (const order of orders) {
    if (order.email.trim().toLowerCase() === email) {
      myOrders.push(order);
    } else if (order.referral_partner_id === partnerId) {
      clientOrders.push(order);
    }
  }

  return { clientOrders, myOrders };
}

export type PartnerCustomer = {
  email: string;
  name: string;
  mobile: string;
  orderCount: number;
  totalSpend: number;
  mostRecentOrderAt: string;
};

/** Spec §43 "Customers" - the partner's referred customers, aggregated from Client Orders. */
export function summarizePartnerCustomers(clientOrders: PartnerOrder[]): PartnerCustomer[] {
  const byEmail = new Map<string, PartnerCustomer>();

  for (const order of clientOrders) {
    const key = order.email.trim().toLowerCase();
    const existing = byEmail.get(key);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpend += order.total;
      if (order.created_at > existing.mostRecentOrderAt) existing.mostRecentOrderAt = order.created_at;
    } else {
      byEmail.set(key, {
        email: order.email,
        name: order.customer_name,
        mobile: order.mobile,
        orderCount: 1,
        totalSpend: order.total,
        mostRecentOrderAt: order.created_at,
      });
    }
  }

  return Array.from(byEmail.values()).sort((a, b) => b.totalSpend - a.totalSpend);
}

export type EarningsStatus = 'payable' | 'pending' | 'void';

/**
 * No separate earnings/payout table exists (spec §44's "Pending/Approved/
 * Paid" buckets aren't tracked as their own state machine). Status is
 * derived from the underlying order + payment instead. Client request:
 * "their commission is not counted until the order is marked as
 * complete" - a paid-but-not-yet-fulfilled order is still `pending`, not
 * `payable`; only order.status === 'completed' (the courier actually
 * delivered it) makes an earning payable, ready for Lean & Fit's
 * (external, manual) payout process - see commission_disbursements
 * (migration 0029) for how that payout gets recorded once it happens. A
 * cancelled or returned-to-seller order, or a refunded/rejected/
 * cancelled/failed payment, means no earning is actually due.
 */
export function earningsStatusForOrder(order: PartnerOrder): EarningsStatus {
  if (order.status === 'cancelled' || order.status === 'returned') return 'void';
  const voidPaymentStatuses: PaymentStatus[] = ['refunded', 'cancelled', 'rejected', 'failed'];
  if (order.payment && voidPaymentStatuses.includes(order.payment.status)) return 'void';
  if (order.status === 'completed') return 'payable';
  return 'pending';
}

export type EarningsEntry = { order: PartnerOrder; status: EarningsStatus; amount: number };

export type EarningsSummary = {
  total: number;
  payable: number;
  pending: number;
  voided: number;
  entries: EarningsEntry[];
};

export type MonthlySales = { onlineSales: number; earnings: number; orderCount: number };

/** 'YYYY-MM' key for grouping by calendar month, derived from an ISO timestamp. */
export function monthKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

/**
 * Partner Overview's month-filterable "Total Online Sales" / "Total
 * Earnings" cards - Client Orders (referred-customer sales) grouped by
 * the calendar month they were placed in. Follows the same revenue
 * convention as admin's "Revenue (Paid)" card (OrderStats.tsx): only a
 * payment that actually cleared counts, and a cancelled or
 * returned-to-seller order never counts even if it was paid first - an
 * "online sale" here means a sale that actually converted, not merely
 * submitted.
 */
export function summarizePartnerSalesByMonth(clientOrders: PartnerOrder[]): Map<string, MonthlySales> {
  const byMonth = new Map<string, MonthlySales>();

  for (const order of clientOrders) {
    if (order.payment?.status !== 'paid') continue;
    if (order.status === 'cancelled' || order.status === 'returned') continue;

    const key = monthKey(order.created_at);
    const existing = byMonth.get(key) ?? { onlineSales: 0, earnings: 0, orderCount: 0 };
    existing.onlineSales += order.total;
    existing.earnings += order.partner_earnings ?? 0;
    existing.orderCount += 1;
    byMonth.set(key, existing);
  }

  return byMonth;
}

export type PartnerOwnOrderInput = {
  quantity: number;
  paymentMethod: PaymentMethodId;
  proofFile: File;
  deliveryNotes?: string | null;
};

export type CreatedPartnerOwnOrder = {
  orderId: string;
  orderNo: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
};

/**
 * Client request: "clients should be able to order for themselves inside
 * the partner portal... at a price that's already discounted according
 * to how much their % off is." Calls migration 0029's partner_create_order()
 * RPC, which prices the order SERVER-SIDE at the calling partner's own
 * tier discount and creates it with the same order_type/partner_id
 * wholesale-order shape as an admin-keyed manual order (migration 0023) -
 * never referral_partner_id/partner_earnings, since this isn't a referred
 * sale. Manual payment only (no COD/Ganap) with required proof upload,
 * same shape as the one-time package payment (PackagePaymentStep.tsx).
 */
export async function createPartnerOwnOrder(input: PartnerOwnOrderInput): Promise<CreatedPartnerOwnOrder> {
  const proofPath = await uploadPaymentProof(input.proofFile);

  const { data, error } = await supabase.rpc('partner_create_order', {
    p_quantity: input.quantity,
    p_payment_method: input.paymentMethod,
    p_payment_proof_path: proofPath,
    p_delivery_notes: input.deliveryNotes || null,
  });

  if (error) throw new Error(`Failed to place order: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Order was not created.');

  return {
    orderId: row.order_id,
    orderNo: row.order_no,
    orderStatus: row.order_status,
    paymentStatus: row.payment_status,
  };
}

/** Spec §44 "Commission / Earnings" - summarized from Client Orders' partner_earnings. */
export function summarizePartnerEarnings(clientOrders: PartnerOrder[]): EarningsSummary {
  const entries: EarningsEntry[] = clientOrders
    .filter((order) => order.partner_earnings != null && order.partner_earnings > 0)
    .map((order) => ({
      order,
      status: earningsStatusForOrder(order),
      amount: order.partner_earnings as number,
    }));

  const sumWhere = (status: EarningsStatus) =>
    entries.filter((e) => e.status === status).reduce((sum, e) => sum + e.amount, 0);

  const payable = sumWhere('payable');
  const pending = sumWhere('pending');
  const voided = sumWhere('void');

  return { total: payable + pending, payable, pending, voided, entries };
}
