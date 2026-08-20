import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminPermissions, useAdminRole } from './RequireAuth';
import type { StaffPermissions } from '../../lib/adminStaff';

/**
 * Migration 0019's per-staff-account permission grants - gates Products/
 * Promotions/Partner Pricing on role='admin' OR the specific permission
 * key being granted, instead of RequireFullAdmin's flat role='admin'-only
 * block. Server-side enforcement is the real gate (has_permission() on
 * the RLS policies); this is just so a staff account without the grant
 * never sees a form that would silently fail to save.
 */
export function RequirePermission({
  permission,
  children,
}: PropsWithChildren<{ permission: keyof StaffPermissions }>) {
  const role = useAdminRole();
  const permissions = useAdminPermissions();
  const allowed = role === 'admin' || Boolean(permissions[permission]);
  if (!allowed) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
