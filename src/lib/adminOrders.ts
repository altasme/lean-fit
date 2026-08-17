import { supabase, PAYMENT_PROOFS_BUCKET } from './supabase';
import type { Order, OrderStatus, OrderStatusHistory } from '../types/order';
import type { Payment, PaymentStatus, PaymentStatusHistory } from '../types/payment';
import { writeAuditLog } from './auditLog';

export type OrderWithPayment = Order & { payment: Payment | null };

async function currentAdminId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function listOrders(): Promise<OrderWithPayment[]> {
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

export async function getOrder(id: string): Promise<Order> {
  const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as Order;
}

export async function getPayment(orderId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Payment | null;
}

export async function getOrderHistory(orderId: string): Promise<OrderStatusHistory[]> {
  const { data, error } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data as OrderStatusHistory[];
}

export async function getPaymentHistory(paymentId: string): Promise<PaymentStatusHistory[]> {
  const { data, error } = await supabase
    .from('payment_status_history')
    .select('*')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data as PaymentStatusHistory[];
}

export async function getProofSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (error || !data) throw new Error(error?.message ?? 'Could not create signed URL');
  return data.signedUrl;
}

async function setPaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  note: string,
  extra?: { verified: boolean },
): Promise<void> {
  const update: Record<string, unknown> = { status };
  let changedBy: string | null = null;

  if (extra?.verified) {
    changedBy = await currentAdminId();
    update.verified_at = new Date().toISOString();
    update.verified_by = changedBy;
  }

  const { error: updateError } = await supabase.from('payments').update(update).eq('id', paymentId);
  if (updateError) throw new Error(updateError.message);

  const { error: historyError } = await supabase
    .from('payment_status_history')
    .insert({ payment_id: paymentId, status, note, changed_by: changedBy });
  if (historyError) throw new Error(historyError.message);

  await writeAuditLog({
    entity_type: 'payment',
    entity_id: paymentId,
    action: 'status_changed',
    field: 'Payment Status',
    new_value: status,
    note,
  });
}

async function setOrderStatus(
  orderId: string,
  status: OrderStatus,
  note: string,
  extra?: { courier?: string; tracking_number?: string },
): Promise<void> {
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status, ...extra })
    .eq('id', orderId);
  if (updateError) throw new Error(updateError.message);

  const { error: historyError } = await supabase
    .from('order_status_history')
    .insert({ order_id: orderId, status, note });
  if (historyError) throw new Error(historyError.message);

  await writeAuditLog({
    entity_type: 'order',
    entity_id: orderId,
    action: 'status_changed',
    field: 'Order Status',
    new_value: status,
    note,
  });
}

/**
 * Manual payment methods only (gcash/maya/bank_transfer). Approving auto-
 * advances the order out of `pending` per CLAUDE.md §10's rule: "when
 * payment.status -> paid and order.status = pending, auto-advance
 * order -> confirmed". COD orders are already `confirmed` at submission,
 * so this rule is a no-op for them (see `markCodPaid` instead).
 */
export async function approvePayment(paymentId: string, order: Order): Promise<void> {
  await setPaymentStatus(paymentId, 'paid', 'Payment approved by admin', { verified: true });
  if (order.status === 'pending') {
    await setOrderStatus(order.id, 'confirmed', 'Auto-confirmed: payment approved');
  }
}

export async function rejectPayment(paymentId: string): Promise<void> {
  await setPaymentStatus(paymentId, 'rejected', 'Payment rejected by admin');
}

/** COD only - payment collected on delivery. Order is already `confirmed`. */
export async function markCodPaid(paymentId: string): Promise<void> {
  await setPaymentStatus(paymentId, 'paid', 'Cash collected on delivery', { verified: true });
}

export async function refundPayment(paymentId: string): Promise<void> {
  await setPaymentStatus(paymentId, 'refunded', 'Refunded by admin (processed externally)');
}

export async function cancelOrder(orderId: string): Promise<void> {
  await setOrderStatus(orderId, 'cancelled', 'Cancelled by admin');
}

export async function advanceOrderStatus(
  orderId: string,
  status: Extract<OrderStatus, 'packing' | 'shipped' | 'completed'>,
  extra?: { courier?: string; tracking_number?: string },
): Promise<void> {
  const note =
    status === 'packing'
      ? 'Order moved to packing'
      : status === 'shipped'
        ? 'Order shipped'
        : 'Order completed';
  await setOrderStatus(orderId, status, note, extra);
}
