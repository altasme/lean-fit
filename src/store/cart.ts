import { create } from 'zustand';
import type { DeliveryDetails } from '../types/order';
import type { PaymentMethodId } from '../types/payment';

type CartState = {
  quantity: number;
  /** Live product name/price, set by useActiveProduct() - never hardcoded. */
  productName: string | null;
  unitPrice: number | null;
  /** Undiscounted SRP - needed to evaluate a discount code's minimum order
   * value against the un-promo'd subtotal (discounts don't stack). */
  srp: number | null;
  deliveryFee: number;
  delivery: DeliveryDetails;
  paymentMethod: PaymentMethodId | null;
  /** Discount Code state - set by OrderSummary once a valid code is
   * applied. Replaces any product-promo discount entirely (never stacks) -
   * see lib/pricing.ts's applyDiscountCode. */
  discountCode: string | null;
  discountedSubtotal: number | null;
  appliedDiscountPromotionId: string | null;
  setQuantity: (qty: number) => void;
  setPricing: (productName: string | null, unitPrice: number | null, srp: number | null, deliveryFee: number) => void;
  setDelivery: (delivery: Partial<DeliveryDetails>) => void;
  setPaymentMethod: (method: PaymentMethodId) => void;
  setDiscount: (code: string | null, discountedSubtotal: number | null, promotionId: string | null) => void;
  reset: () => void;
  subtotal: () => number | null;
  total: () => number | null;
  /** Amount actually shaved off by the applied discount code, for display
   * and for the order's discount_amount audit column - 0 when no code is
   * applied (a product promotion's discount is already baked into
   * unitPrice, it has nothing separate to report here). */
  discountAmount: () => number;
};

const emptyDelivery: DeliveryDetails = {
  customerName: '',
  mobile: '',
  email: '',
  address: '',
  barangay: '',
  city: '',
  province: '',
  postalCode: '',
  deliveryNotes: '',
};

export const useCartStore = create<CartState>((set, get) => ({
  quantity: 1,
  productName: null,
  unitPrice: null,
  srp: null,
  deliveryFee: 0,
  delivery: emptyDelivery,
  paymentMethod: null,
  discountCode: null,
  discountedSubtotal: null,
  appliedDiscountPromotionId: null,

  setQuantity: (qty) => set({ quantity: Math.max(1, qty) }),
  setPricing: (productName, unitPrice, srp, deliveryFee) => set({ productName, unitPrice, srp, deliveryFee }),
  setDelivery: (delivery) => set((state) => ({ delivery: { ...state.delivery, ...delivery } })),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setDiscount: (code, discountedSubtotal, promotionId) =>
    set({ discountCode: code, discountedSubtotal, appliedDiscountPromotionId: promotionId }),
  reset: () =>
    set({
      quantity: 1,
      delivery: emptyDelivery,
      paymentMethod: null,
      discountCode: null,
      discountedSubtotal: null,
      appliedDiscountPromotionId: null,
    }),

  subtotal: () => {
    const { discountedSubtotal, unitPrice, quantity } = get();
    if (discountedSubtotal !== null) return discountedSubtotal;
    return unitPrice === null ? null : unitPrice * quantity;
  },
  total: () => {
    const subtotal = get().subtotal();
    return subtotal === null ? null : subtotal + get().deliveryFee;
  },
  discountAmount: () => {
    const { discountedSubtotal, srp, quantity } = get();
    if (discountedSubtotal === null || srp === null) return 0;
    return Math.max(0, Math.round((srp * quantity - discountedSubtotal) * 100) / 100);
  },
}));
