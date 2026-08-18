import type { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Logo } from '../layout/Logo';

// Media is built (migration 0003, /admin/media, Cloudinary upload flow)
// but hidden from the nav for now per client request - the route itself
// is also redirected away in App.tsx so it's not reachable by direct URL
// either. Nothing was deleted; re-add the nav entry to bring it back.
const NAV_LINKS = [
  { to: '/admin', label: 'Orders' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/promotions', label: 'Promotions' },
  { to: '/admin/partner-pricing', label: 'Partner Pricing' },
  { to: '/admin/partners', label: 'Partners' },
  { to: '/admin/territories', label: 'Territories' },
  { to: '/admin/territory-map', label: 'Territory Map' },
  { to: '/admin/audit-log', label: 'Audit Log' },
];

export function AdminLayout({ children }: PropsWithChildren) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-lf-black">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-lf-charcoal/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="font-kicker text-xs uppercase tracking-wide2 text-lf-cream/50 transition-colors hover:text-lf-gold"
          >
            Sign Out
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 sm:px-6">
          {NAV_LINKS.map((link) => {
            const active = link.to === '/admin' ? pathname === '/admin' : pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 font-kicker text-xs uppercase tracking-wide2 transition-colors ${
                  active
                    ? 'border-lf-gold text-lf-gold'
                    : 'border-transparent text-lf-cream/60 hover:border-white/20 hover:text-lf-cream'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}
