// Shared CORS handling for every Edge Function the browser calls directly
// (supabase.functions.invoke(...) from src/lib/*.ts). Supabase's Edge
// Runtime does NOT add CORS headers automatically - each function must
// answer the browser's OPTIONS preflight itself and stamp every response
// (success AND error) with Access-Control-Allow-Origin, or the browser
// blocks the request before the function's own logic ever runs. This bit
// every client-invoked function in this project at once (none of them
// handled it), surfacing as "No 'Access-Control-Allow-Origin' header" in
// the browser console the first time a function was actually called from
// a real deployed frontend instead of local dev.
//
// `_shared/` is a Supabase CLI convention - a folder starting with `_` is
// never deployed as its own function, only importable by the others.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Call first in every handler - answers the browser's preflight and lets the caller `return` immediately. */
export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
