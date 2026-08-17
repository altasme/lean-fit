import type { PropsWithChildren } from 'react';
import { supabase } from '../../lib/supabase';
import { Logo } from '../layout/Logo';

// Mirrors AdminLayout's shell (header + sign out, no marketing nav/footer/
// StickyCTA) for the partner portal. No nav links yet beyond the
// dashboard itself - Phase F (orders/earnings/downline) adds more.
export function PartnerLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-lf-black">
      <header className="border-b border-white/10 bg-lf-charcoal">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-6">
            <Logo />
            <span className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
              Partner Portal
            </span>
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
      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}
