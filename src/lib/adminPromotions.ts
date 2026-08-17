import { supabase } from './supabase';
import type { DiscountType, Promotion, PromotionStatus } from '../types/promotion';

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
  return data as Promotion;
}

export async function updatePromotion(id: string, input: PromotionInput): Promise<Promotion> {
  const { data, error } = await supabase
    .from('promotions')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Promotion;
}
