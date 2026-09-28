import { supabase } from './supabase';
import { writeAuditLog } from './auditLog';
import { earningsStatusForOrder } from './partnerOrders';
import type { PartnerOrder } from './partnerOrders';
import type { Order } from '../types/order';
import type { Payment } from '../types/payment';

// Client request: admin's partner list should show "how much commission
// is pending" instead of the package column, and the partner detail page
// should get a dedicated Commission panel where admin can record manual
// disbursements (migration 0029's commission_disbursements table - a
// manual ledger, not automated payout processing per CLAUDE.md §13).
//
// "Pending" here always means: this partner's accrued ("payable" - see
// earningsStatusForOrder in lib/partnerOrders.ts, which requires the
// underlying order to be marked `completed`) commission, minus whatever's
// already been recorded as disbursed. Both this file and the partner
// portal's CommissionTab derive "payable" from the exact same function,
// so the two never disagree about when a commission counts.

export type CommissionDisbursement = {
  id: string;
  partner_id: string;
  amount: number;
  disbursed_at: string;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type PartnerCommissionSummary = {
  accrued: number;
  disbursed: number;
  pending: number;
};

/**
 * Every partner's accrued (payable) commission, keyed by referral_partner_id.
 * Same "two queries joined in JS" pattern as adminOrders.ts's listOrders()/
 * partnerOrders.ts's fetchPartnerVisibleOrders() - reused here rather than
 * an untested PostgREST embedded-resource join, per this codebase's
 * established convention.
 */
export async function fetchAccruedCommissionByPartner(): Promise<Map<string, number>> {
  const [{ data: orders, error: ordersError }, { data: payments, error: paymentsError }] =
    await Promise.all([
      supabase.from('orders').select('*').not('referral_partner_id', 'is', null),
      supabase.from('payments').select('*'),
    ]);
  if (ordersError) throw new Error(ordersError.message);
  if (paymentsError) throw new Error(paymentsError.message);

  const paymentByOrderId = new Map((payments as Payment[]).map((p) => [p.order_id, p]));
  const byPartner = new Map<string, number>();

  for (const order of orders as Order[]) {
    if (!order.referral_partner_id || !order.partner_earnings || order.partner_earnings <= 0) continue;
    const withPayment: PartnerOrder = { ...order, payment: paymentByOrderId.get(order.id) ?? null };
    if (earningsStatusForOrder(withPayment) !== 'payable') continue;
    byPartner.set(
      order.referral_partner_id,
      (byPartner.get(order.referral_partner_id) ?? 0) + order.partner_earnings,
    );
  }

  return byPartner;
}

export async function fetchAllCommissionDisbursements(): Promise<CommissionDisbursement[]> {
  const { data, error } = await supabase
    .from('commission_disbursements')
    .select('*')
    .order('disbursed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CommissionDisbursement[];
}

export async function fetchPartnerCommissionDisbursements(partnerId: string): Promise<CommissionDisbursement[]> {
  const { data, error } = await supabase
    .from('commission_disbursements')
    .select('*')
    .eq('partner_id', partnerId)
    .order('disbursed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CommissionDisbursement[];
}

function sumAmounts(rows: CommissionDisbursement[]): number {
  return rows.reduce((sum, r) => sum + r.amount, 0);
}

/** AdminPartners.tsx list column - pending commission per partner, accrued minus disbursed. */
export async function fetchPendingCommissionByPartner(): Promise<Map<string, number>> {
  const [accrued, disbursements] = await Promise.all([
    fetchAccruedCommissionByPartner(),
    fetchAllCommissionDisbursements(),
  ]);

  const disbursedByPartner = new Map<string, number>();
  for (const d of disbursements) {
    disbursedByPartner.set(d.partner_id, (disbursedByPartner.get(d.partner_id) ?? 0) + d.amount);
  }

  const pending = new Map<string, number>();
  for (const [partnerId, amount] of accrued) {
    pending.set(partnerId, Math.max(0, amount - (disbursedByPartner.get(partnerId) ?? 0)));
  }
  return pending;
}

/** AdminPartnerDetail.tsx's Commission panel - one partner's full accrued/disbursed/pending breakdown plus their disbursement history. */
export async function fetchPartnerCommissionSummary(
  partnerId: string,
): Promise<PartnerCommissionSummary & { disbursements: CommissionDisbursement[] }> {
  const [accruedByPartner, disbursements] = await Promise.all([
    fetchAccruedCommissionByPartner(),
    fetchPartnerCommissionDisbursements(partnerId),
  ]);
  const accrued = accruedByPartner.get(partnerId) ?? 0;
  const disbursed = sumAmounts(disbursements);
  return { accrued, disbursed, pending: Math.max(0, accrued - disbursed), disbursements };
}

export async function recordCommissionDisbursement(input: {
  partnerId: string;
  amount: number;
  disbursedAt: string;
  note?: string | null;
}): Promise<CommissionDisbursement> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('commission_disbursements')
    .insert({
      partner_id: input.partnerId,
      amount: input.amount,
      disbursed_at: input.disbursedAt,
      note: input.note || null,
      recorded_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog({
    entity_type: 'commission_disbursement',
    entity_id: input.partnerId,
    action: 'recorded',
    new_value: String(input.amount),
    note: input.note ?? undefined,
  });

  return data as CommissionDisbursement;
}
