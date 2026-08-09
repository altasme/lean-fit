import { supabase, PAYMENT_PROOFS_BUCKET } from './supabase';
import { PRODUCT } from '../content/product';
import type { DeliveryDetails, OrderStatus, PaymentMethodId } from '../types/order';

export type CreateOrderInput = {
  delivery: DeliveryDetails;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethodId;
  referenceNumber: string;
  amountPaid: number;
  paymentDate: string;
  proofFile: File;
};

export type CreatedOrder = {
  id: string;
  orderNo: string;
  status: OrderStatus;
};

async function uploadProof(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(PAYMENT_PROOFS_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw new Error(`Failed to upload payment proof: ${error.message}`);
  return path;
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const proofPath = await uploadProof(input.proofFile);

  const { data, error } = await supabase.rpc('create_order', {
    p_customer_name: input.delivery.customerName,
    p_email: input.delivery.email,
    p_mobile: input.delivery.mobile,
    p_address: input.delivery.address,
    p_barangay: input.delivery.barangay,
    p_city: input.delivery.city,
    p_province: input.delivery.province,
    p_postal_code: input.delivery.postalCode,
    p_delivery_notes: input.delivery.deliveryNotes || null,
    p_product: `${PRODUCT.name} - ${PRODUCT.variant}`,
    p_quantity: input.quantity,
    p_unit_price: input.unitPrice,
    p_subtotal: input.subtotal,
    p_delivery_fee: input.deliveryFee,
    p_total: input.total,
    p_payment_method: input.paymentMethod,
    p_payment_reference: input.referenceNumber,
    p_payment_amount: input.amountPaid,
    p_payment_date: input.paymentDate,
    p_payment_proof_path: proofPath,
  });

  if (error) throw new Error(`Failed to create order: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Order was not created.');

  return { id: row.id, orderNo: row.order_no, status: row.status };
}
