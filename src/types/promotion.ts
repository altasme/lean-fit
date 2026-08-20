export type DiscountType = 'percentage' | 'fixed';
export type PromotionStatus = 'active' | 'inactive';

// 'product' - auto-applies to one specific product once the cart subtotal
// reaches min_order_value, no code. 'code' - customer enters this code at
// checkout to discount the order subtotal once it reaches min_order_value.
// The two never stack - see src/lib/pricing.ts.
export type PromotionType = 'product' | 'code';

export type Promotion = {
  id: string;
  name: string;
  promotion_type: PromotionType;
  code: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number | null;
  product_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  times_used: number;
  status: PromotionStatus;
  created_at: string;
  updated_at: string;
};

export const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = {
  product: 'Product Promotion',
  code: 'Discount Code',
};
