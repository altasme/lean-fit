/**
 * supabase-js's `functions.invoke()` only ever puts a generic message on a
 * failed call - "Edge Function returned a non-2xx status code" for a
 * `FunctionsHttpError`, regardless of what the function actually said. The
 * real reason (our functions all respond with `jsonResponse({ error: '...' })`
 * on failure) is on `error.context`, the raw fetch `Response`, and has to be
 * read asynchronously - see the @supabase/functions-js docs' own example
 * (`await error.context.json()`). Without this, every Edge Function failure
 * in the admin UI reads as the same unhelpful generic string no matter what
 * actually went wrong (bad input, a missing secret, the function not being
 * deployed at all, etc).
 */
export async function functionErrorMessage(error: { message: string; context?: unknown }): Promise<string> {
  if (error.context instanceof Response) {
    try {
      const body = await error.context.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      // Not a JSON body (e.g. a raw gateway 404/502, not our own
      // jsonResponse) - fall through to the generic message below.
    }
  }
  return error.message;
}
