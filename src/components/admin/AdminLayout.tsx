import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Logo } from '../layout/Logo';

export function AdminLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-lf-black">
      <header className="border-b border-white/10 bg-lf-charcoal">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-6">
            <Logo />
            <Link
              to="/admin"
              className="font-kicker text-sm uppercase tracking-wide2 text-lf-cream/80 hover:text-lf-gold"
            >
              Orders
            </Link>
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
