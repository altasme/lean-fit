/**
 * Centralized pricing engine - Lean & Fit Phase 2 Admin Panel spec §11-16.
 *
 * This is the ONLY place price should be calculated. Product cards, product
 * pages, checkout, and admin must all call into this module rather than
 * computing price independently (spec §12: "the system must avoid
 * situations where website says X, checkout says Y, admin says Z").
 *
 * Two separate pricing contexts, never stacked (spec §16):
 *  - Retail: SRP, reduced by at most one promotion - either the auto-apply
 *    "current promotion" (no code needed) or a customer-entered discount
 *    code. A code always replaces the current promotion, never adds to it.
 *  - Partner: SRP, reduced by the partner's fixed tier discount. Retail
 *    promotions never apply to partner pricing.
 */
import type { Product } from '../types/product';
import type { Promotion } from '../types/promotion';
import type { PartnerPricingTier, PartnerType } from '../types/partner';

export type PriceContext = 'retail' | 'retail_promo' | 'partner';

export type PriceResult = {
  price: number;
  srp: number;
  context: PriceContext;
  appliedPromotion: Promotion | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Whether `promotion` currently applies to `product` - active, within its
 * date window, under its usage limit, targets this product (or targets
 * everything, if `applicable_product_ids` is empty), and the product isn't
 * marked exempt. Spec §10-11.
 */
export function isPromotionApplicable(
  promotion: Promotion,
  product: Product,
  now: Date = new Date(),
): boolean {
  if (product.promo_exempt) return false;
  if (promotion.status !== 'active') return false;
  if (promotion.starts_at && now < new Date(promotion.starts_at)) return false;
  if (promotion.ends_at && now > new Date(promotion.ends_at)) return false;
  if (promotion.usage_limit != null && promotion.times_used >= promotion.usage_limit) return false;
  if (
    promotion.applicable_product_ids.length > 0 &&
    !promotion.applicable_product_ids.includes(product.id)
  ) {
    return false;
  }
  return true;
}

/** Case-insensitive discount-code lookup among currently-active promotions. */
export function findPromotionByCode(promotions: Promotion[], code: string): Promotion | null {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;
  return promotions.find((p) => p.code.toLowerCase() === normalized) ?? null;
}

/**
 * The promotion currently applied automatically to `product`, with no code
 * needed - i.e. what the site shows as the product's "current price". If
 * more than one auto-apply promotion is applicable at once, the one that
 * yields the lowest price wins (they never stack with each other either).
 */
export function findCurrentPromotion(product: Product, activePromotions: Promotion[]): Promotion | null {
  const candidates = activePromotions.filter(
    (p) => p.auto_apply && isPromotionApplicable(p, product),
  );
  if (candidates.length === 0) return null;

  return candidates.reduce((best, p) =>
    applyDiscount(product.srp, p) < applyDiscount(product.srp, best) ? p : best,
  );
}

function applyDiscount(srp: number, promotion: Promotion): number {
  const discounted =
    promotion.discount_type === 'percentage'
      ? srp * (1 - promotion.discount_value / 100)
      : srp - promotion.discount_value;
  return round2(Math.max(0, discounted));
}

/**
 * Retail price for a product.
 *
 * - No code entered: uses the auto-apply "current promotion" if one is
 *   applicable, else SRP.
 * - A valid code entered: uses that promotion instead. A code NEVER stacks
 *   with the auto-apply current promotion - one replaces the other, they
 *   are never combined into a bigger discount.
 * - An invalid/inapplicable code falls back to the current promotion (if
 *   any) rather than punishing the customer with a bad code back to SRP.
 */
export function calculateRetailPrice(
  product: Product,
  activePromotions: Promotion[],
  promoCode?: string,
): PriceResult {
  const srp = product.srp;
  const currentPromotion = findCurrentPromotion(product, activePromotions);

  if (promoCode) {
    const codePromotion = findPromotionByCode(activePromotions, promoCode);
    if (codePromotion && isPromotionApplicable(codePromotion, product)) {
      return {
        price: applyDiscount(srp, codePromotion),
        srp,
        context: 'retail_promo',
        appliedPromotion: codePromotion,
      };
    }
  }

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
 * Partner price for a product: SRP reduced by the partner's tier discount.
 * Retail promotions never apply here (spec §16).
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
