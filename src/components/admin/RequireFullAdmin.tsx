import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminRole } from './RequireAuth';

/**
 * Item #5's RBAC - gates Products/Promotions/Partner Pricing/User
 * Management to role='admin' specifically (a 'staff_admin' can see
 * Orders, per the brief, but not these). Always nested inside
 * RequireAuth, which resolves the role - server-side enforcement is the
 * real gate (migration 0014's is_full_admin() on the RLS policies), this
 * is just so staff never sees a form that would silently fail to save.
 */
export function RequireFullAdmin({ children }: PropsWithChildren) {
  const role = useAdminRole();
  if (role !== 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
