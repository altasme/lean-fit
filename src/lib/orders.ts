import { supabase, uploadPaymentProof } from './supabase';
import type { DeliveryDetails, OrderStatus } from '../types/order';
import type { PaymentMethodId, PaymentStatus } from '../types/payment';

export type CreateOrderInput = {
  delivery: DeliveryDetails;
  /** Live product name at time of purchase - see useActiveProduct(). */
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethodId;
  /** Manual methods only (gcash/maya/bank_transfer) - omitted for COD. */
  proofFile?: File;
  /** From getStoredReferralCode() - resolved/validated server-side, see migration 0008. */
  referralCode?: string | null;
  /** Set when a discount code was applied at checkout - see store/cart.ts. */
  discountAmount?: number;
  appliedPromotionId?: string | null;
};

export type CreatedOrder = {
  orderId: string;
  orderNo: string;
  orderStatus: OrderStatus;
  paymentId: string;
  paymentNo: string;
  paymentStatus: PaymentStatus;
};

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const proofPath = input.proofFile ? await uploadPaymentProof(input.proofFile) : null;

  const { data, error } = await supabase.rpc('create_order_with_payment', {
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
    p_payment_reference: null,
    p_payment_amount: null,
    p_payment_date: null,
    p_payment_proof_path: proofPath,
    p_referral_code: input.referralCode ?? null,
    p_discount_amount: input.discountAmount ?? 0,
    p_applied_promotion_id: input.appliedPromotionId ?? null,
  });

  if (error) throw new Error(`Failed to create order: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Order was not created.');

  return {
    orderId: row.order_id,
    orderNo: row.order_no,
    orderStatus: row.order_status,
    paymentId: row.payment_id,
    paymentNo: row.payment_no,
    paymentStatus: row.payment_status,
  };
}
