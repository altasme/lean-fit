// Supabase Edge Function - mints a signed Cloudinary upload for the admin
// media panel. The client uploads directly to Cloudinary using this
// signature; CLOUDINARY_API_SECRET never reaches the browser.
//
// Secrets required (set with `supabase secrets set KEY=value`):
//   CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically.
//
// Admin-only: rejects any caller that isn't a signed-in Supabase user
// (anon key alone doesn't resolve to a user), since this controls what
// gets uploaded to the site's media library.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY') ?? '';
const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET') ?? '';
const CLOUDINARY_CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME') ?? '';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !CLOUDINARY_CLOUD_NAME) {
      return new Response(JSON.stringify({ error: 'Cloudinary is not configured' }), {
        status: 500,
      });
    }

    const { slot } = await req.json();
    if (!slot || typeof slot !== 'string') {
      return new Response(JSON.stringify({ error: 'slot is required' }), { status: 400 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `lean-fit/${slot}`;
    // Cloudinary signature = sha1(sorted "key=value&..." of every signed
    // param + api secret). Only timestamp/folder are signed here, so the
    // client can't upload to a different folder than the one issued.
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = await sha1Hex(paramsToSign + CLOUDINARY_API_SECRET);

    return new Response(
      JSON.stringify({
        timestamp,
        folder,
        signature,
        apiKey: CLOUDINARY_API_KEY,
        cloudName: CLOUDINARY_CLOUD_NAME,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
