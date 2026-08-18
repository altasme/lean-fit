import { useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Logo } from '../layout/Logo';
import { useAdminRole } from './RequireAuth';

// Media, Territories, and Territory Map are all built but hidden from the
// nav for now per client request - their routes also redirect away in
// App.tsx so they're not reachable by direct URL either. Nothing was
// deleted; re-add the nav entry (and un-redirect the route) to bring any
// of them back.
const NAV_LINKS = [
  { to: '/admin', label: 'Orders' },
  { to: '/admin/products', label: 'Products', fullAdminOnly: true },
  { to: '/admin/promotions', label: 'Promotions', fullAdminOnly: true },
  { to: '/admin/audit-log', label: 'Audit Log' },
];

function PartnersMenu({ active, fullAdmin }: { active: boolean; fullAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 whitespace-nowrap border-b-2 px-3 py-3 font-kicker text-xs uppercase tracking-wide2 transition-colors ${
          active || open
            ? 'border-lf-gold text-lf-gold'
            : 'border-transparent text-lf-cream/60 hover:border-white/20 hover:text-lf-cream'
        }`}
      >
        Partners <span className="text-[10px]">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 min-w-[180px] rounded-sm border border-white/10 bg-lf-charcoal py-1.5 shadow-lg">
          <Link
            to="/admin/partners"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 font-kicker text-xs uppercase tracking-wide2 text-lf-cream/80 hover:bg-white/5 hover:text-lf-gold"
          >
            All Partners
          </Link>
          {fullAdmin && (
            <Link
              to="/admin/partner-pricing"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 font-kicker text-xs uppercase tracking-wide2 text-lf-cream/80 hover:bg-white/5 hover:text-lf-gold"
            >
              Partner Pricing
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminLayout({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  const role = useAdminRole();
  const fullAdmin = role === 'admin';

  const links = NAV_LINKS.filter((l) => !l.fullAdminOnly || fullAdmin);
  const partnersActive = pathname.startsWith('/admin/partners') || pathname.startsWith('/admin/partner-pricing');

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
        <nav className="mx-auto flex max-w-6xl items-stretch gap-1 overflow-x-auto px-3 sm:px-6">
          {links.map((link) => {
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
          <PartnersMenu active={partnersActive} fullAdmin={fullAdmin} />
          {fullAdmin && (
            <Link
              to="/admin/staff"
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 font-kicker text-xs uppercase tracking-wide2 transition-colors ${
                pathname.startsWith('/admin/staff')
                  ? 'border-lf-gold text-lf-gold'
                  : 'border-transparent text-lf-cream/60 hover:border-white/20 hover:text-lf-cream'
              }`}
            >
              User Management
            </Link>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}
