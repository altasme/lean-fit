import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Logo } from '../layout/Logo';
import { useAdminPermissions, useAdminRole } from './RequireAuth';
import type { StaffPermissions } from '../../lib/adminStaff';
import { countNewPendingPartners } from '../../lib/adminPartners';

// Media, Territories, and Territory Map are all built but hidden from the
// nav for now per client request - their routes also redirect away in
// App.tsx so they're not reachable by direct URL either. Nothing was
// deleted; re-add the nav entry (and un-redirect the route) to bring any
// of them back.
const NAV_LINKS: { to: string; label: string; permission?: keyof StaffPermissions }[] = [
  { to: '/admin', label: 'Orders' },
  { to: '/admin/products', label: 'Products', permission: 'products' },
  { to: '/admin/promotions', label: 'Promotions', permission: 'promotions' },
  { to: '/admin/top-sellers', label: 'Top Sellers' },
  { to: '/admin/audit-log', label: 'Audit Log' },
];

function PartnersMenu({ active, showPricing }: { active: boolean; showPricing: boolean }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [newCount, setNewCount] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // AdminLayout wraps every admin page fresh (it's not a single
  // long-lived shell) - a plain mount-time fetch already refreshes this
  // on every navigation, including "view a pending partner, then go
  // back to Partners," which is exactly when the count should drop.
  useEffect(() => {
    countNewPendingPartners()
      .then(setNewCount)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Closing on scroll (rather than repositioning) is simplest - the admin
  // header is sticky so the trigger rarely moves anyway, and this avoids a
  // stale-position dropdown floating away from its button.
  useEffect(() => {
    if (!open) return;
    function onScroll() {
      setOpen(false);
    }
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [open]);

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom, left: rect.left });
    }
    setOpen((o) => !o);
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className={`relative flex items-center gap-1 whitespace-nowrap border-b-2 px-3 py-3 font-kicker text-xs uppercase tracking-wide2 transition-colors ${
          active || open
            ? 'border-lf-gold text-lf-gold'
            : 'border-transparent text-lf-cream/60 hover:border-white/20 hover:text-lf-cream'
        }`}
      >
        Partners <span className="text-[10px]">{open ? '▴' : '▾'}</span>
        {newCount > 0 && (
          <span
            className="tabular absolute -right-1.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-lf-gold px-1 text-[10px] font-semibold text-lf-black"
            title={`${newCount} new application${newCount === 1 ? '' : 's'}`}
          >
            {newCount}
          </span>
        )}
      </button>
      {open &&
        createPortal(
          // Rendered via portal, not as a child of the horizontally-scrolling
          // <nav> below - `overflow-x-auto` on that nav implicitly forces
          // overflow-y to `auto` too (a real CSS quirk, not a typo), which
          // was clipping this dropdown before it could ever be seen.
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: coords.top, left: coords.left }}
            className="z-50 min-w-[180px] rounded-sm border border-white/10 bg-lf-charcoal py-1.5 shadow-lg"
          >
            <Link
              to="/admin/partners"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 font-kicker text-xs uppercase tracking-wide2 text-lf-cream/80 hover:bg-white/5 hover:text-lf-gold"
            >
              All Partners
            </Link>
            {showPricing && (
              <Link
                to="/admin/partner-pricing"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 font-kicker text-xs uppercase tracking-wide2 text-lf-cream/80 hover:bg-white/5 hover:text-lf-gold"
              >
                Partner Pricing
              </Link>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function AdminLayout({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  const role = useAdminRole();
  const permissions = useAdminPermissions();
  const fullAdmin = role === 'admin';
  const has = (p?: keyof StaffPermissions) => !p || fullAdmin || Boolean(permissions[p]);

  const links = NAV_LINKS.filter((l) => has(l.permission));
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
          <PartnersMenu active={partnersActive} showPricing={has('partner_pricing')} />
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
