import { supabase } from './supabase';
import type { Order } from '../types/order';
import type { Payment, PaymentStatus } from '../types/payment';

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
 * Paid" buckets aren't tracked as their own state machine - CLAUDE.md §13
 * rules out building automated payouts). Status is derived from the
 * underlying order + payment instead: a paid payment means the earning is
 * ready for Lean & Fit's (external, manual) payout process; a cancelled
 * order or a refunded/rejected/cancelled payment means no earning is
 * actually due; anything else is still pending.
 */
export function earningsStatusForOrder(order: PartnerOrder): EarningsStatus {
  if (order.status === 'cancelled') return 'void';
  const voidPaymentStatuses: PaymentStatus[] = ['refunded', 'cancelled', 'rejected', 'failed'];
  if (order.payment && voidPaymentStatuses.includes(order.payment.status)) return 'void';
  if (order.payment?.status === 'paid') return 'payable';
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
