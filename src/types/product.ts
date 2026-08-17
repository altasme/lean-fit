export type ProductStatus = 'draft' | 'active' | 'inactive';

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  srp: number;
  status: ProductStatus;
  promo_exempt: boolean;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  inactive: 'Inactive',
};
