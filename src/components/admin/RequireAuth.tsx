import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabase';

/**
 * Gates /admin/* on both "is there a session" (any authenticated user) AND
 * "is this user in admin_users" - the same is_admin() check migration
 * 0007's RLS retrofit applies at the database layer. Before Reseller Phase
 * D, any authenticated session was necessarily the admin, so a session
 * check alone was enough; now that partners log in too, a signed-in
 * partner must never see the admin shell (even an RLS-empty one).
 */
export function RequireAuth({ children }: PropsWithChildren) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) {
      setIsAdmin(null);
      return;
    }
    let cancelled = false;
    supabase
      .rpc('is_admin')
      .then(({ data, error }) => {
        if (!cancelled) setIsAdmin(error ? false : Boolean(data));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (loading || (session && isAdmin === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lf-black text-lf-cream/60">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lf-black px-5">
        <div className="w-full max-w-md rounded-sm border border-white/10 bg-lf-charcoal p-8 text-center">
          <h1 className="font-kicker text-lg uppercase tracking-wide2 text-lf-white">
            Not An Admin Account
          </h1>
          <p className="mt-3 text-sm text-lf-cream/70">
            {session.user.email} is signed in but isn't marked as an admin. If this should be an
            admin account, add its user id to <code className="text-lf-gold">admin_users</code> in
            the Supabase SQL editor:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-sm bg-lf-black px-4 py-3 text-left text-xs text-lf-cream/80">
            insert into admin_users (user_id) values ('{session.user.id}');
          </pre>
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
