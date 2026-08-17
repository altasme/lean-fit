import { supabase } from './supabase';
import type { Product, ProductStatus } from '../types/product';
import { logFieldChanges, writeAuditLog } from './auditLog';

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

  const product = data as Product;
  await writeAuditLog({
    entity_type: 'product',
    entity_id: product.id,
    action: 'created',
    note: product.name,
  });

  return product;
}

const AUDITED_PRODUCT_FIELDS: { key: keyof Product; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'srp', label: 'SRP' },
  { key: 'status', label: 'Status' },
  { key: 'promo_exempt', label: 'Exempt from Promo' },
];

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const before = await getProduct(id);

  const { data, error } = await supabase
    .from('products')
    .update(toRow(input))
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  const after = data as Product;
  await logFieldChanges('product', id, before, after, AUDITED_PRODUCT_FIELDS);

  return after;
}

export function productImages(product: Product): string[] {
  const images = product.details?.images;
  return Array.isArray(images) ? images.filter((i): i is string => typeof i === 'string') : [];
}
