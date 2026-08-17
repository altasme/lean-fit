import { useEffect, useState } from 'react';
import { fetchActiveProduct } from '../lib/product';
import type { ActiveProductPricing } from '../lib/product';
import { useCartStore } from '../store/cart';
import { PRODUCT } from '../content/product';

/**
 * Fetches the live active product + price and pushes it into the cart
 * store, so every component that reads price/product name from the store
 * (OrderSummary, Checkout) sees the same live values this hook resolved -
 * never a separately hardcoded number. Safe to call from multiple
 * components; each call re-fetches and re-sets the same store fields.
 */
export function useActiveProduct() {
  const [data, setData] = useState<ActiveProductPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setPricing = useCartStore((s) => s.setPricing);

  useEffect(() => {
    let cancelled = false;

    fetchActiveProduct()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setPricing(result?.product.name ?? null, result?.price ?? null, PRODUCT.deliveryFee);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load product.');
        setPricing(null, null, PRODUCT.deliveryFee);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    product: data?.product ?? null,
    price: data?.price ?? null,
    srp: data?.srp ?? null,
    appliedPromotion: data?.appliedPromotion ?? null,
    partnerPricing: data?.partnerPricing ?? false,
    loading,
    error,
  };
}
