import { supabase } from './supabase';
import type { DiscountType, Promotion, PromotionStatus } from '../types/promotion';
import { logFieldChanges, writeAuditLog } from './auditLog';

export type PromotionInput = {
  name: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  status: PromotionStatus;
  applicable_product_ids: string[];
  auto_apply: boolean;
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
    note: `${promotion.name} (${promotion.code})`,
  });

  return promotion;
}

const AUDITED_PROMOTION_FIELDS: { key: keyof Promotion; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Discount Code' },
  { key: 'discount_type', label: 'Discount Type' },
  { key: 'discount_value', label: 'Discount Value' },
  { key: 'starts_at', label: 'Start Date' },
  { key: 'ends_at', label: 'End Date' },
  { key: 'usage_limit', label: 'Usage Limit' },
  { key: 'status', label: 'Status' },
  { key: 'applicable_product_ids', label: 'Applicable Products' },
  { key: 'auto_apply', label: 'Auto-Apply' },
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
