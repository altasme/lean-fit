import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { usePartnerAuth } from './PartnerAuthProvider';
import { supabase } from '../../lib/supabase';

const LOADING = (
  <div className="flex min-h-screen items-center justify-center bg-lf-black text-lf-cream/60">
    Loading…
  </div>
);

export function RequirePartnerAuth({ children }: PropsWithChildren) {
  const { session, loading: sessionLoading } = useAuth();
  const { partner, loading: partnerLoading } = usePartnerAuth();

  if (sessionLoading || (session && partnerLoading)) return LOADING;

  if (!session) {
    return <Navigate to="/reseller/login" replace />;
  }

  if (!partner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lf-black px-5">
        <div className="w-full max-w-md rounded-sm border border-white/10 bg-lf-charcoal p-8 text-center">
          <h1 className="font-kicker text-lg uppercase tracking-wide2 text-lf-white">
            No Partner Account Found
          </h1>
          <p className="mt-3 text-sm text-lf-cream/70">
            {session.user.email} is signed in but isn't linked to a Lean &amp; Fit partner account.
            If you're expecting portal access, contact us so we can look into it.
          </p>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="btn-outline mt-5 !px-5 !py-2.5 !text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (partner.status !== 'active') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lf-black px-5">
        <div className="w-full max-w-md rounded-sm border border-white/10 bg-lf-charcoal p-8 text-center">
          <h1 className="font-kicker text-lg uppercase tracking-wide2 text-lf-white">
            Portal Access Unavailable
          </h1>
          <p className="mt-3 text-sm text-lf-cream/70">
            Your partner account status is currently "{partner.status}". Contact us if you believe
            this is unexpected.
          </p>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="btn-outline mt-5 !px-5 !py-2.5 !text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
