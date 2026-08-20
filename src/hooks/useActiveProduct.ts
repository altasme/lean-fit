import { useEffect, useState } from 'react';
import { fetchActiveProductData, computeActiveProductPricing } from '../lib/product';
import type { ActiveProductData } from '../lib/product';
import { useCartStore } from '../store/cart';
import { PRODUCT } from '../content/product';

/**
 * Fetches the live active product/promotions/tiers once, then re-derives
 * price locally (no re-fetch) whenever the cart's shared quantity changes -
 * a Product Promotion's minimum order value is quantity-dependent, so
 * price has to react to the qty stepper on the homepage Purchase section
 * and Checkout alike. Pushes the result into the cart store, so every
 * component that reads price/product name from the store (OrderSummary,
 * Checkout) sees the same live values this hook resolved - never a
 * separately hardcoded number. Safe to call from multiple components; each
 * call re-fetches its own copy of the raw data and re-sets the same store
 * fields.
 */
export function useActiveProduct() {
  const [data, setData] = useState<ActiveProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setPricing = useCartStore((s) => s.setPricing);
  const quantity = useCartStore((s) => s.quantity);

  useEffect(() => {
    let cancelled = false;

    fetchActiveProductData()
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load product.');
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const pricing = data ? computeActiveProductPricing(data, quantity) : null;

  useEffect(() => {
    setPricing(pricing?.product.name ?? null, pricing?.price ?? null, pricing?.srp ?? null, PRODUCT.deliveryFee);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricing?.product.id, pricing?.price, pricing?.srp]);

  return {
    product: pricing?.product ?? null,
    price: pricing?.price ?? null,
    srp: pricing?.srp ?? null,
    appliedPromotion: pricing?.appliedPromotion ?? null,
    partnerPricing: pricing?.partnerPricing ?? false,
    partnerReferralCode: pricing?.partnerReferralCode ?? null,
    /** Active promotions (product + code type) - Checkout uses this to
     * validate a customer-entered discount code. Empty for partner pricing
     * (retail promotions never apply there). */
    promotions: data?.promotions ?? [],
    loading,
    error,
  };
}
