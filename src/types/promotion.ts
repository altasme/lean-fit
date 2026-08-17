export type DiscountType = 'percentage' | 'fixed';
export type PromotionStatus = 'active' | 'inactive';

export type Promotion = {
  id: string;
  name: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  times_used: number;
  status: PromotionStatus;
  applicable_product_ids: string[];
  auto_apply: boolean;
  created_at: string;
  updated_at: string;
};
