import { supabase } from './supabase';
import { calculateRetailPrice } from './pricing';
import type { Product } from '../types/product';
import type { Promotion } from '../types/promotion';

export type ActiveProductPricing = {
  product: Product;
  price: number;
  srp: number;
  appliedPromotion: Promotion | null;
};

/**
 * Live product + price for the public site and checkout - the single
 * fetch both call into, per Admin Panel spec §12 ("never calculate/fetch
 * pricing independently in product cards vs checkout"). Picks the oldest
 * active product; this storefront only ever shows one product today, so
 * there's no product-selection UI yet to pick a different one if the
 * admin ever creates a second.
 */
export async function fetchActiveProduct(): Promise<ActiveProductPricing | null> {
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1);
  if (productError) throw new Error(productError.message);

  const product = products?.[0] as Product | undefined;
  if (!product) return null;

  const { data: promotions, error: promoError } = await supabase
    .from('promotions')
    .select('*')
    .eq('status', 'active');
  if (promoError) throw new Error(promoError.message);

  const result = calculateRetailPrice(product, (promotions ?? []) as Promotion[]);
  return { product, price: result.price, srp: result.srp, appliedPromotion: result.appliedPromotion };
}
