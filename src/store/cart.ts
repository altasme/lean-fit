import { create } from 'zustand';
import { PRODUCT } from '../content/product';
import type { DeliveryDetails, PaymentMethodId } from '../types/order';

type CartState = {
  quantity: number;
  delivery: DeliveryDetails;
  paymentMethod: PaymentMethodId | null;
  setQuantity: (qty: number) => void;
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
  delivery: emptyDelivery,
  paymentMethod: null,

  setQuantity: (qty) => set({ quantity: Math.max(1, qty) }),
  setDelivery: (delivery) => set((state) => ({ delivery: { ...state.delivery, ...delivery } })),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  reset: () => set({ quantity: 1, delivery: emptyDelivery, paymentMethod: null }),

  subtotal: () => (PRODUCT.price === null ? null : PRODUCT.price * get().quantity),
  total: () => {
    const subtotal = get().subtotal();
    return subtotal === null ? null : subtotal + PRODUCT.deliveryFee;
  },
}));
