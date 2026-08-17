import { supabase } from './supabase';
import type { Product, ProductStatus } from '../types/product';

export type ProductInput = {
  slug: string;
  name: string;
  description: string;
  srp: number;
  status: ProductStatus;
  promo_exempt: boolean;
  images: string[];
};

function toRow(input: ProductInput) {
  return {
    slug: input.slug,
    name: input.name,
    description: input.description || null,
    srp: input.srp,
    status: input.status,
    promo_exempt: input.promo_exempt,
    details: { images: input.images },
  };
}

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Product[];
}

export async function getProduct(id: string): Promise<Product> {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as Product;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data, error } = await supabase.from('products').insert(toRow(input)).select().single();
  if (error) throw new Error(error.message);
  return data as Product;
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(toRow(input))
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Product;
}

export function productImages(product: Product): string[] {
  const images = product.details?.images;
  return Array.isArray(images) ? images.filter((i): i is string => typeof i === 'string') : [];
}
