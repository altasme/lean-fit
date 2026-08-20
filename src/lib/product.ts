import { supabase } from './supabase';
import { calculatePartnerPrice, calculateRetailPrice } from './pricing';
import type { Product } from '../types/product';
import type { Promotion } from '../types/promotion';
import type { PartnerPricingTier, PartnerType } from '../types/partner';

export type ActiveProductPricing = {
  product: Product;
  price: number;
  srp: number;
  appliedPromotion: Promotion | null;
  /** True when `price` is the signed-in partner's own tier price, not retail. */
  partnerPricing: boolean;
  /**
   * The signed-in partner's own referral code when `partnerPricing` is
   * true, else null. Checkout passes this through to create_order_with_
   * payment as the order's referral code (same as an ordinary `?ref=`
   * link) so the order is traceable in Admin's existing "Referral
   * Attribution" panel instead of silently showing a below-SRP price with
   * no explanation - the resulting partner_earnings computes to exactly 0
   * (buyer's tier price - own tier price = 0), so this never pays out a
   * phantom commission on a partner's own purchase.
   */
  partnerReferralCode: string | null;
};

/** Raw ingredients for pricing - fetched once, recomputed locally as the
 * cart quantity changes (a Product Promotion's minimum order value is
 * quantity-dependent) without round-tripping to Supabase on every qty tick. */
export type ActiveProductData = {
  product: Product;
  promotions: Promotion[];
  partner: { partner_type: PartnerType; referral_code: string | null } | null;
  tiers: PartnerPricingTier[];
};

/**
 * Fetches the live product + everything needed to price it, for the
 * public site and checkout - the single fetch both call into, per Admin
 * Panel spec §12 ("never calculate/fetch pricing independently in product
 * cards vs checkout"). Picks the oldest active product; this storefront
 * only ever shows one product today, so there's no product-selection UI
 * yet to pick a different one if the admin ever creates a second.
 *
 * A signed-in, active partner buying for themselves gets their own tier
 * price via `computeActiveProductPricing` instead of retail/promo pricing
 * (retail promotions never apply to partner pricing). This is the same
 * Supabase Auth session as the partner portal - anyone who happens to be
 * signed in on the public site while shopping for themselves gets it
 * automatically, no separate "shop as partner" toggle needed.
 */
export async function fetchActiveProductData(): Promise<ActiveProductData | null> {
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1);
  if (productError) throw new Error(productError.message);

  const product = products?.[0] as Product | undefined;
  if (!product) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: partner } = await supabase
      .from('partners')
      .select('partner_type, status, referral_code')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (partner) {
      const { data: tiers, error: tierError } = await supabase.from('partner_pricing_tiers').select('*');
      if (tierError) throw new Error(tierError.message);

      return {
        product,
        promotions: [],
        partner: { partner_type: partner.partner_type, referral_code: partner.referral_code ?? null },
        tiers: (tiers ?? []) as PartnerPricingTier[],
      };
    }
  }

  const { data: promotions, error: promoError } = await supabase
    .from('promotions')
    .select('*')
    .eq('status', 'active');
  if (promoError) throw new Error(promoError.message);

  return { product, promotions: (promotions ?? []) as Promotion[], partner: null, tiers: [] };
}

/** Pure - derives the price for `data` at `quantity`, no network access. */
export function computeActiveProductPricing(data: ActiveProductData, quantity: number): ActiveProductPricing {
  if (data.partner) {
    const result = calculatePartnerPrice(data.product, data.partner.partner_type, data.tiers);
    return {
      product: data.product,
      price: result.price,
      srp: result.srp,
      appliedPromotion: null,
      partnerPricing: true,
      partnerReferralCode: data.partner.referral_code,
    };
  }

  const result = calculateRetailPrice(data.product, data.promotions, quantity);
  return {
    product: data.product,
    price: result.price,
    srp: result.srp,
    appliedPromotion: result.appliedPromotion,
    partnerPricing: false,
    partnerReferralCode: null,
  };
}
