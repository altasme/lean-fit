import { supabase, PAYMENT_PROOFS_BUCKET, uploadPaymentProof } from './supabase';
import type { DeliveryDetails, Order, OrderStatus, OrderStatusHistory, OrderType } from '../types/order';
import type { Payment, PaymentMethodId, PaymentStatus, PaymentStatusHistory } from '../types/payment';
import { writeAuditLog } from './auditLog';

export type OrderWithPayment = Order & { payment: Payment | null };

export type CreateManualPartnerOrderInput = {
  orderType: Extract<OrderType, 'reseller' | 'distributor' | 'franchise'>;
  partnerId: string;
  delivery: DeliveryDetails;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethodId;
  paymentReference?: string | null;
  paymentAmount?: number | null;
  paymentDate?: string | null;
  proofFile?: File | null;
  /** Admin already confirmed the payment on their end - skip the usual verification step. */
  markPaid?: boolean;
};

export type CreatedManualOrder = {
  orderId: string;
  orderNo: string;
  orderStatus: OrderStatus;
  paymentId: string;
  paymentNo: string;
  paymentStatus: PaymentStatus;
};

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

/**
 * COD only - a COD order can't be marked paid independently of delivery
 * (there's nothing to verify beforehand, unlike manual payments). It's
 * only ever marked paid at the same moment it's marked completed, as one
 * combined action: cash was collected on delivery, so the order is both
 * done and paid. Order must already be `shipped`.
 */
export async function completeCodOrder(orderId: string, paymentId: string): Promise<void> {
  await setPaymentStatus(paymentId, 'paid', 'Cash collected on delivery', { verified: true });
  await setOrderStatus(orderId, 'completed', 'Order completed - COD payment collected');
}

/**
 * Return to Seller - a shipped-stage exception for an order the courier
 * never delivered. Only reachable from `shipped`. Doesn't touch payment
 * status (a prepaid manual order stays `paid` on its payment record for
 * refund bookkeeping, a COD order stays unpaid since cash was never
 * collected) - it's purely a fulfillment dead end, deliberately excluded
 * from revenue reporting regardless of payment status (see OrderStats.tsx).
 */
export async function markOrderReturned(orderId: string): Promise<void> {
  await setOrderStatus(orderId, 'returned', 'Returned to seller (RTS) - not delivered');
}

export async function refundPayment(paymentId: string): Promise<void> {
  await setPaymentStatus(paymentId, 'refunded', 'Refunded by admin (processed externally)');
}

export async function cancelOrder(orderId: string): Promise<void> {
  await setOrderStatus(orderId, 'cancelled', 'Cancelled by admin');
}

/**
 * Admin-keyed wholesale/restock order for an existing ACTIVE Reseller/
 * Distributor/Franchise partner buying more stock at their tier price -
 * NOT a referred retail sale (see migration 0023 / types/order.ts).
 * Calls the `admin_create_manual_order` RPC, which validates the partner
 * is active and matches `orderType` server-side.
 */
export async function createManualPartnerOrder(
  input: CreateManualPartnerOrderInput,
): Promise<CreatedManualOrder> {
  const proofPath = input.proofFile ? await uploadPaymentProof(input.proofFile) : null;

  const { data, error } = await supabase.rpc('admin_create_manual_order', {
    p_order_type: input.orderType,
    p_partner_id: input.partnerId,
    p_customer_name: input.delivery.customerName,
    p_email: input.delivery.email,
    p_mobile: input.delivery.mobile,
    p_address: input.delivery.address,
    p_barangay: input.delivery.barangay,
    p_city: input.delivery.city,
    p_province: input.delivery.province,
    p_postal_code: input.delivery.postalCode,
    p_delivery_notes: input.delivery.deliveryNotes || null,
    p_product: input.productName,
    p_quantity: input.quantity,
    p_unit_price: input.unitPrice,
    p_subtotal: input.subtotal,
    p_delivery_fee: input.deliveryFee,
    p_total: input.total,
    p_payment_method: input.paymentMethod,
    p_payment_reference: input.paymentReference ?? null,
    p_payment_amount: input.paymentAmount ?? null,
    p_payment_date: input.paymentDate ?? null,
    p_payment_proof_path: proofPath,
    p_mark_paid: input.markPaid ?? false,
  });

  if (error) throw new Error(`Failed to create order: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Order was not created.');

  await writeAuditLog({
    entity_type: 'order',
    entity_id: row.order_id,
    action: 'created',
    field: 'Order',
    new_value: row.order_no,
    note: `Manually added ${input.orderType} order for partner`,
  });

  return {
    orderId: row.order_id,
    orderNo: row.order_no,
    orderStatus: row.order_status,
    paymentId: row.payment_id,
    paymentNo: row.payment_no,
    paymentStatus: row.payment_status,
  };
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
