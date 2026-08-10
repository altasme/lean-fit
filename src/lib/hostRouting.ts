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
