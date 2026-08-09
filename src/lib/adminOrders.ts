import { supabase, PAYMENT_PROOFS_BUCKET } from './supabase';
import type { Order, OrderStatus, OrderStatusHistory } from '../types/order';

export async function listOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Order[];
}

export async function getOrder(id: string): Promise<Order> {
  const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as Order;
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

export async function getProofSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (error || !data) throw new Error(error?.message ?? 'Could not create signed URL');
  return data.signedUrl;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string,
  extra?: { courier?: string; tracking_number?: string },
): Promise<void> {
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status, ...extra })
    .eq('id', orderId);

  if (updateError) throw new Error(updateError.message);

  const { error: historyError } = await supabase
    .from('order_status_history')
    .insert({ order_id: orderId, status, note: note ?? null });

  if (historyError) throw new Error(historyError.message);
}
