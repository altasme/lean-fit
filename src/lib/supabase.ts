import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    'Supabase env vars are not set (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
      'Checkout and admin features will not work until the Supabase project is configured.',
  );
}

// Fall back to a syntactically valid placeholder so the app can still
// render (landing page, etc.) when Supabase hasn't been configured yet -
// any actual request will fail loudly instead of crashing on import.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder');

export const PAYMENT_PROOFS_BUCKET = 'payment-proofs';

/** Shared by retail checkout and partner package payment - same bucket/policy either way. */
export async function uploadPaymentProof(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(PAYMENT_PROOFS_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw new Error(`Failed to upload payment proof: ${error.message}`);
  return path;
}
