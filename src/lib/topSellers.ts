import { supabase } from './supabase';
import type { PartnerType } from '../types/partner';

export type TopSeller = {
  partner_id: string;
  full_name: string;
  partner_type: PartnerType;
  online_sales: number;
  earnings: number;
  order_count: number;
};

/**
 * Top-20 partners by online (referred, paid) sales - migration 0018's
 * get_top_sellers() RPC. Shared by both the partner portal's "Top Seller
 * Rankings" tab and admin's "Top Sellers" page (client spec items #3/#4 -
 * "same function"). `month` is the first day of the calendar month to
 * scope to (e.g. '2026-08-01'); omit for all-time.
 */
export async function fetchTopSellers(month?: string): Promise<TopSeller[]> {
  const { data, error } = await supabase.rpc('get_top_sellers', { p_month: month ?? null });
  if (error) throw new Error(error.message);
  return (data ?? []) as TopSeller[];
}
