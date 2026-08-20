/**
 * Centralized pricing engine - Lean & Fit Phase 2 Admin Panel spec §11-16,
 * extended by the Promotions split (Product Promotion / Discount Code).
 *
 * This is the ONLY place price should be calculated. Product cards, product
 * pages, checkout, and admin must all call into this module rather than
 * computing price independently (spec §12: "the system must avoid
 * situations where website says X, checkout says Y, admin says Z").
 *
 * Three separate pricing contexts, never stacked:
 *  - Retail: SRP, reduced by at most one Product Promotion targeting this
 *    product, once the cart subtotal (qty * SRP) reaches that promotion's
 *    minimum order value. No code involved.
 *  - Retail + Discount Code: a customer-entered code discounts the ORDER
 *    subtotal once it reaches the code's minimum order value. A valid code
 *    always replaces whatever Product Promotion would otherwise have
 *    applied - never combined into a bigger discount.
 *  - Partner: SRP, reduced by the partner's fixed tier discount. Retail
 *    promotions (product or code) never apply to partner pricing.
 */
import type { Product } from '../types/product';
import type { Promotion } from '../types/promotion';
import type { PartnerPricingTier, PartnerType } from '../types/partner';

export type PriceContext = 'retail' | 'retail_promo' | 'retail_code' | 'partner';

export type PriceResult = {
  price: number;
  srp: number;
  context: PriceContext;
  appliedPromotion: Promotion | null;
};

export type OrderDiscountResult = {
  subtotal: number;
  appliedPromotion: Promotion | null;
  error: string | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isWithinWindow(promotion: Promotion, now: Date): boolean {
  if (promotion.starts_at && now < new Date(promotion.starts_at)) return false;
  if (promotion.ends_at && now > new Date(promotion.ends_at)) return false;
  return true;
}

function isUnderUsageLimit(promotion: Promotion): boolean {
  return promotion.usage_limit == null || promotion.times_used < promotion.usage_limit;
}

/**
 * Whether `promotion` (a Product Promotion) currently applies to `product`
 * at `quantity` - active, within its date window, under its usage limit,
 * targets this exact product, the product isn't marked exempt, and the
 * cart subtotal at SRP meets the promotion's minimum order value (no
 * minimum = always eligible on that front).
 */
export function isProductPromotionApplicable(
  promotion: Promotion,
  product: Product,
  quantity: number,
  now: Date = new Date(),
): boolean {
  if (promotion.promotion_type !== 'product') return false;
  if (product.promo_exempt) return false;
  if (promotion.status !== 'active') return false;
  if (promotion.product_id !== product.id) return false;
  if (!isWithinWindow(promotion, now)) return false;
  if (!isUnderUsageLimit(promotion)) return false;
  if (promotion.min_order_value != null && product.srp * quantity < promotion.min_order_value) {
    return false;
  }
  return true;
}

function applyDiscount(base: number, promotion: Promotion): number {
  const discounted =
    promotion.discount_type === 'percentage'
      ? base * (1 - promotion.discount_value / 100)
      : base - promotion.discount_value;
  return round2(Math.max(0, discounted));
}

/**
 * The Product Promotion currently applying automatically to `product` at
 * `quantity`, with no code needed. Only one product promotion can ever
 * target a given product (admin UI enforces this), so there's no
 * "pick the best of several" tie-break needed here.
 */
export function findCurrentPromotion(
  product: Product,
  activePromotions: Promotion[],
  quantity: number,
): Promotion | null {
  return (
    activePromotions.find((p) => isProductPromotionApplicable(p, product, quantity)) ?? null
  );
}

/**
 * Per-unit retail price for a product at the given quantity - the Product
 * Promotion targeting it, if the cart subtotal meets its minimum, else SRP.
 * Discount codes are a separate, order-level concern - see
 * `applyDiscountCode` below, applied at checkout on top of this.
 */
export function calculateRetailPrice(
  product: Product,
  activePromotions: Promotion[],
  quantity: number,
): PriceResult {
  const srp = product.srp;
  const currentPromotion = findCurrentPromotion(product, activePromotions, quantity);

  if (currentPromotion) {
    return {
      price: applyDiscount(srp, currentPromotion),
      srp,
      context: 'retail_promo',
      appliedPromotion: currentPromotion,
    };
  }

  return { price: srp, srp, context: 'retail', appliedPromotion: null };
}

/**
 * Applies a customer-entered discount code to an order subtotal computed
 * at SRP (never on top of an already product-promo-discounted subtotal -
 * discounts don't stack, see module doc). Returns the original subtotal
 * unchanged with an `error` message if the code doesn't exist, isn't
 * active, is out of its date window/usage limit, or the subtotal doesn't
 * meet its minimum order value yet.
 */
export function applyDiscountCode(
  srpSubtotal: number,
  activePromotions: Promotion[],
  code: string,
  now: Date = new Date(),
): OrderDiscountResult {
  const normalized = code.trim().toLowerCase();
  const promotion =
    activePromotions.find((p) => p.promotion_type === 'code' && p.code?.toLowerCase() === normalized) ??
    null;

  if (!promotion) {
    return { subtotal: srpSubtotal, appliedPromotion: null, error: 'That discount code was not found.' };
  }
  if (promotion.status !== 'active' || !isWithinWindow(promotion, now) || !isUnderUsageLimit(promotion)) {
    return { subtotal: srpSubtotal, appliedPromotion: null, error: 'That discount code is no longer valid.' };
  }
  if (promotion.min_order_value != null && srpSubtotal < promotion.min_order_value) {
    return {
      subtotal: srpSubtotal,
      appliedPromotion: null,
      error: `This code needs a minimum order of ${promotion.min_order_value}.`,
    };
  }

  return { subtotal: applyDiscount(srpSubtotal, promotion), appliedPromotion: promotion, error: null };
}

/**
 * Partner price for a product: SRP reduced by the partner's tier discount.
 * Retail promotions (product or code) never apply here (spec §16).
 */
export function calculatePartnerPrice(
  product: Product,
  partnerType: PartnerType,
  tiers: PartnerPricingTier[],
): PriceResult {
  const srp = product.srp;
  const tier = tiers.find((t) => t.partner_type === partnerType);
  const discountPct = tier?.discount_pct ?? 0;
  return {
    price: round2(srp * (1 - discountPct / 100)),
    srp,
    context: 'partner',
    appliedPromotion: null,
  };
}
