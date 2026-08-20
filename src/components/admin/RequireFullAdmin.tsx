import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminRole } from './RequireAuth';

/**
 * Item #5's RBAC - gates User Management to role='admin' specifically.
 * Products/Promotions/Partner Pricing moved to the finer-grained
 * RequirePermission (migration 0019) so individual staff accounts can be
 * granted those without becoming a full admin; User Management stays
 * admin-only unconditionally - granting it as a permission would let a
 * staff account widen its own access. Always nested inside RequireAuth,
 * which resolves the role - server-side enforcement is the real gate
 * (migration 0014's is_full_admin()), this is just so staff never sees a
 * form that would silently fail to save.
 */
export function RequireFullAdmin({ children }: PropsWithChildren) {
  const role = useAdminRole();
  if (role !== 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
