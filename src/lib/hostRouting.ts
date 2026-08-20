/**
 * Lets one Cloudflare Pages deployment serve the admin app on its own
 * subdomain without a separate build/project. Add the extra custom
 * domain in Cloudflare (DNS -> same target as the main site) and this
 * detects it at runtime - no env var or redeploy needed to add a domain.
 *
 * Live domain: admin.leanandfit.ph - matched by a plain "admin" prefix
 * check so any admin-labeled hostname works (including old preview/dev
 * subdomains) without hardcoding the exact domain here.
 */
const ADMIN_HOST_PREFIXES = ['admin'];

export function isAdminHost(hostname: string = window.location.hostname): boolean {
  return ADMIN_HOST_PREFIXES.some((prefix) => hostname.startsWith(prefix));
}

/**
 * Item #4 - the reseller/partner portal gets its own subdomain
 * (partner.leanandfit.ph), same "one deployment, hostname-detected"
 * pattern as the admin subdomain above - no separate build/project, just
 * an extra custom domain added in Cloudflare. "/" on that host goes
 * straight to the partner dashboard (which itself redirects to
 * /reseller/login if not signed in - same as how the admin host's "/" ->
 * "/admin" relies on RequireAuth to redirect an unauthenticated visitor).
 * "reseller"/"rs" stay in the prefix list too so older preview/dev
 * subdomains using those names keep working.
 */
const RESELLER_HOST_PREFIXES = ['partner', 'reseller', 'rs'];

export function isResellerHost(hostname: string = window.location.hostname): boolean {
  return RESELLER_HOST_PREFIXES.some((prefix) => hostname.startsWith(prefix));
}

/**
 * "admin." / "partner." stripped off, e.g. "admin.leanandfit.ph" ->
 * "leanandfit.ph". Used by lib/partners.ts buildReferralUrl as a
 * best-effort fallback (when VITE_SITE_URL isn't configured) so a
 * referral link built from inside the partner portal points at the
 * customer-facing site instead of the portal subdomain itself. Falls
 * through unchanged if the hostname doesn't start with a known prefix
 * (plain custom domains, localhost, preview URLs).
 */
export function stripPortalPrefix(hostname: string = window.location.hostname): string {
  for (const prefix of [...ADMIN_HOST_PREFIXES, ...RESELLER_HOST_PREFIXES]) {
    if (hostname === prefix || hostname.startsWith(`${prefix}.`)) {
      return hostname.slice(prefix.length + 1);
    }
  }
  return hostname;
}
