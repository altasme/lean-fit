/**
 * Lets one Cloudflare Pages deployment serve the admin app on its own
 * subdomain without a separate build/project. Add the extra custom
 * domain in Cloudflare (DNS -> same target as the main site) and this
 * detects it at runtime - no env var or redeploy needed to add a domain.
 *
 * Dev: adminleanfit.altasme.com   Launch: admin.<client-domain>.<tld>
 * Both start with "admin", so a simple prefix check covers both without
 * hardcoding a specific domain (which will change once the client locks
 * .ph vs .com - see CLAUDE.md §15).
 */
const ADMIN_HOST_PREFIXES = ['admin'];

export function isAdminHost(hostname: string = window.location.hostname): boolean {
  return ADMIN_HOST_PREFIXES.some((prefix) => hostname.startsWith(prefix));
}

/**
 * Item #4 - the reseller/partner portal gets its own subdomain
 * (rsleanfit.altasme.com dev, reseller.<client-domain> at launch), same
 * "one deployment, hostname-detected" pattern as the admin subdomain
 * above - no separate build/project, just an extra custom domain added
 * in Cloudflare. "/" on that host goes straight to the partner dashboard
 * (which itself redirects to /reseller/login if not signed in - same as
 * how the admin host's "/" -> "/admin" relies on RequireAuth to redirect
 * an unauthenticated visitor).
 */
const RESELLER_HOST_PREFIXES = ['rs', 'reseller'];

export function isResellerHost(hostname: string = window.location.hostname): boolean {
  return RESELLER_HOST_PREFIXES.some((prefix) => hostname.startsWith(prefix));
}
