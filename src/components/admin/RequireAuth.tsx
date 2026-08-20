import { createContext, useContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabase';
import type { AdminRole } from '../../types/partner';
import type { StaffPermissions } from '../../lib/adminStaff';

const AdminRoleContext = createContext<AdminRole | null>(null);
const AdminPermissionsContext = createContext<StaffPermissions>({});

/** The signed-in admin's role ('admin' | 'staff_admin') - null outside RequireAuth. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAdminRole(): AdminRole | null {
  return useContext(AdminRoleContext);
}

/**
 * The signed-in staff account's per-feature grants (migration 0019) -
 * meaningless for role='admin' (they already pass every check
 * unconditionally, see RequirePermission below) and empty by default for
 * a fresh staff_admin account until an admin grants something in User
 * Management.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAdminPermissions(): StaffPermissions {
  return useContext(AdminPermissionsContext);
}

/**
 * Gates /admin/* on both "is there a session" (any authenticated user) AND
 * "is this user in admin_users" - the same is_admin() check migration
 * 0007's RLS retrofit applies at the database layer. Before Reseller Phase
 * D, any authenticated session was necessarily the admin, so a session
 * check alone was enough; now that partners log in too, a signed-in
 * partner must never see the admin shell (even an RLS-empty one).
 *
 * Also resolves the caller's role and exposes it via useAdminRole() - item
 * #5's RBAC (migration 0014's is_full_admin()) needs the client to know
 * which nav links/routes to hide for a 'staff_admin', not just whether
 * they're an admin at all.
 */
export function RequireAuth({ children }: PropsWithChildren) {
  const { session, loading: sessionLoading } = useAuth();
  const location = useLocation();
  const [role, setRole] = useState<AdminRole | null | undefined>(undefined);
  const [permissions, setPermissions] = useState<StaffPermissions>({});

  useEffect(() => {
    if (!session) {
      setRole(undefined);
      setPermissions({});
      return;
    }
    let cancelled = false;
    supabase
      .from('admin_users')
      // `select('*')` rather than naming `permissions` explicitly - that
      // column only exists once migration 0019 is deployed, and naming a
      // column that isn't there yet makes PostgREST error the whole
      // query (not just omit it), which previously locked out every
      // admin - including ones with a perfectly valid admin_users row -
      // the moment this code shipped ahead of that migration. `select('*')`
      // just returns whatever columns exist.
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        setRole(error || !data ? null : (data.role as AdminRole));
        setPermissions((data?.permissions as StaffPermissions | null) ?? {});
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (sessionLoading || (session && role === undefined)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lf-black text-lf-cream/60">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (!role) {
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

  return (
    <AdminRoleContext.Provider value={role}>
      <AdminPermissionsContext.Provider value={permissions}>{children}</AdminPermissionsContext.Provider>
    </AdminRoleContext.Provider>
  );
}
