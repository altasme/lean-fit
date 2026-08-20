// Captures a partner's referral code from either `leanandfit.ph/{code}`
// (spec: "referrer tracker" path-based link, see App.tsx's /:slug catch-all
// route + pages/ReferralRedirect.tsx) or the older `?ref=CODE` query
// string (spec Part 1 §26, kept working - some links may already be
// shared that way) and persists it so it survives navigation from
// wherever the customer lands through checkout - "must persist through
// website browsing, product viewing, checkout, payment, order creation."
//
// Deliberately minimal: no expiry/TTL (last code seen simply wins,
// indefinitely, until overwritten by a different one or an order is
// placed) and no client-side validation against the `partners` table -
// the code is resolved authoritatively server-side in
// create_order_with_payment() (migration 0008), which silently ignores an
// unknown/inactive code rather than failing checkout. Validating twice
// would just be two sources of truth for the same check.

const STORAGE_KEY = 'lf_referral_code';

function persist(code: string): void {
  const trimmed = code.trim();
  if (!trimmed) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    // localStorage unavailable (private browsing, etc.) - attribution is
    // best-effort, never block the page over it.
  }
}

/** Call once per page load - reads `?ref=` from the current URL, if present. */
export function captureReferralFromUrl(): void {
  if (typeof window === 'undefined') return;
  const code = new URLSearchParams(window.location.search).get('ref');
  if (code) persist(code);
}

/**
 * Called from ReferralRedirect (the /:slug catch-all route) with whatever
 * single path segment the visitor landed on - e.g. leanandfit.ph/maria ->
 * "maria". Same no-validation, best-effort persistence as the `?ref=`
 * path above; an unknown slug is simply an unattributed order later, not
 * a broken page.
 */
export function captureReferralFromPath(slug: string): void {
  if (typeof window === 'undefined') return;
  persist(slug);
}

export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
