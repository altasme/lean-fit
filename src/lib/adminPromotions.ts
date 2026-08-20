import { supabase } from './supabase';
import type { DiscountType, Promotion, PromotionStatus, PromotionType } from '../types/promotion';
import { logFieldChanges, writeAuditLog } from './auditLog';

export type PromotionInput = {
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
  status: PromotionStatus;
};

export async function listPromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Promotion[];
}

export async function getPromotion(id: string): Promise<Promotion> {
  const { data, error } = await supabase.from('promotions').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as Promotion;
}

export async function createPromotion(input: PromotionInput): Promise<Promotion> {
  const { data, error } = await supabase.from('promotions').insert(input).select().single();
  if (error) throw new Error(error.message);

  const promotion = data as Promotion;
  await writeAuditLog({
    entity_type: 'promotion',
    entity_id: promotion.id,
    action: 'created',
    note: promotion.code ? `${promotion.name} (${promotion.code})` : promotion.name,
  });

  return promotion;
}

const AUDITED_PROMOTION_FIELDS: { key: keyof Promotion; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'promotion_type', label: 'Type' },
  { key: 'code', label: 'Discount Code' },
  { key: 'discount_type', label: 'Discount Type' },
  { key: 'discount_value', label: 'Discount Value' },
  { key: 'min_order_value', label: 'Minimum Order Value' },
  { key: 'product_id', label: 'Product' },
  { key: 'starts_at', label: 'Start Date' },
  { key: 'ends_at', label: 'End Date' },
  { key: 'usage_limit', label: 'Usage Limit' },
  { key: 'status', label: 'Status' },
];

export async function updatePromotion(id: string, input: PromotionInput): Promise<Promotion> {
  const before = await getPromotion(id);

  const { data, error } = await supabase
    .from('promotions')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  const after = data as Promotion;
  await logFieldChanges('promotion', id, before, after, AUDITED_PROMOTION_FIELDS);

  return after;
}
