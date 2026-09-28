import { supabase, uploadPaymentProof } from './supabase';
import { functionErrorMessage } from './functionsError';
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
  /**
   * Required when paymentMethod is 'cod' (client request: captcha before
   * COD submission, migration 0032/submit-cod-order Edge Function) -
   * a Cloudflare Turnstile response token from the widget shown on
   * checkout. Ignored for every other payment method.
   */
  captchaToken?: string;
};

export type CreatedOrder = {
  orderId: string;
  orderNo: string;
  orderStatus: OrderStatus;
  paymentId: string;
  paymentNo: string;
  paymentStatus: PaymentStatus;
};

/**
 * COD orders can no longer be created via the direct RPC call below -
 * migration 0032 rejects a 'cod' order unless the caller is service_role,
 * closing the anon-bypass-the-captcha hole. This goes through
 * submit-cod-order instead, which verifies the Turnstile token server-side
 * before creating the order with the service role key.
 */
async function createCodOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  if (!input.captchaToken) {
    throw new Error('Please complete the verification challenge.');
  }

  const { data, error } = await supabase.functions.invoke('submit-cod-order', {
    body: {
      captchaToken: input.captchaToken,
      customerName: input.delivery.customerName,
      email: input.delivery.email,
      mobile: input.delivery.mobile,
      address: input.delivery.address,
      barangay: input.delivery.barangay,
      city: input.delivery.city,
      province: input.delivery.province,
      postalCode: input.delivery.postalCode,
      deliveryNotes: input.delivery.deliveryNotes || null,
      product: input.productName,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee,
      total: input.total,
      referralCode: input.referralCode ?? null,
      discountAmount: input.discountAmount ?? 0,
      appliedPromotionId: input.appliedPromotionId ?? null,
    },
  });

  if (error) throw new Error(await functionErrorMessage(error));
  if (!data?.orderId) throw new Error('Order was not created.');

  return {
    orderId: data.orderId,
    orderNo: data.orderNo,
    orderStatus: data.orderStatus,
    paymentId: data.paymentId,
    paymentNo: data.paymentNo,
    paymentStatus: data.paymentStatus,
  };
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  if (input.paymentMethod === 'cod') return createCodOrder(input);

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
