import { create } from 'zustand';
import type { DeliveryDetails } from '../types/order';
import type { PaymentMethodId } from '../types/payment';

type CartState = {
  quantity: number;
  /** Live product name/price, set by useActiveProduct() - never hardcoded. */
  productName: string | null;
  unitPrice: number | null;
  deliveryFee: number;
  delivery: DeliveryDetails;
  paymentMethod: PaymentMethodId | null;
  setQuantity: (qty: number) => void;
  setPricing: (productName: string | null, unitPrice: number | null, deliveryFee: number) => void;
  setDelivery: (delivery: Partial<DeliveryDetails>) => void;
  setPaymentMethod: (method: PaymentMethodId) => void;
  reset: () => void;
  subtotal: () => number | null;
  total: () => number | null;
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
  deliveryFee: 0,
  delivery: emptyDelivery,
  paymentMethod: null,

  setQuantity: (qty) => set({ quantity: Math.max(1, qty) }),
  setPricing: (productName, unitPrice, deliveryFee) => set({ productName, unitPrice, deliveryFee }),
  setDelivery: (delivery) => set((state) => ({ delivery: { ...state.delivery, ...delivery } })),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  reset: () => set({ quantity: 1, delivery: emptyDelivery, paymentMethod: null }),

  subtotal: () => {
    const { unitPrice, quantity } = get();
    return unitPrice === null ? null : unitPrice * quantity;
  },
  total: () => {
    const subtotal = get().subtotal();
    return subtotal === null ? null : subtotal + get().deliveryFee;
  },
}));
