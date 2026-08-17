// Captures a partner's referral code from `?ref=CODE` (spec Part 1 §26)
// and persists it so it survives navigation from wherever the customer
// lands through checkout - "must persist through website browsing,
// product viewing, checkout, payment, order creation."
//
// Deliberately minimal: no expiry/TTL (last `?ref=` seen simply wins,
// indefinitely, until overwritten by a different one or an order is
// placed) and no client-side validation against the `partners` table -
// the code is resolved authoritatively server-side in
// create_order_with_payment() (migration 0008), which silently ignores an
// unknown/inactive code rather than failing checkout. Validating twice
// would just be two sources of truth for the same check.

const STORAGE_KEY = 'lf_referral_code';

/** Call once per page load - reads `?ref=` from the current URL, if present. */
export function captureReferralFromUrl(): void {
  if (typeof window === 'undefined') return;
  const code = new URLSearchParams(window.location.search).get('ref');
  if (code && code.trim()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, code.trim());
    } catch {
      // localStorage unavailable (private browsing, etc.) - attribution is
      // best-effort, never block the page over it.
    }
  }
}

export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
