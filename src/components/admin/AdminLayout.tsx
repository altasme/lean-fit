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
  { to: '/admin/audit-log', label: 'Audit Log' },
];

export function AdminLayout({ children }: PropsWithChildren) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-lf-black">
      <header className="border-b border-white/10 bg-lf-charcoal">
        <div className="mx-auto flex h-16 max-w-6xl flex-wrap items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="flex items-center gap-5">
              {NAV_LINKS.map((link) => {
                const active =
                  link.to === '/admin' ? pathname === '/admin' : pathname.startsWith(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`font-kicker text-sm uppercase tracking-wide2 hover:text-lf-gold ${
                      active ? 'text-lf-gold' : 'text-lf-cream/80'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="font-kicker text-sm uppercase tracking-wide2 text-lf-cream/60 hover:text-lf-gold"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}
