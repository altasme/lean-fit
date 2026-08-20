import { supabase } from './supabase';
import type { AdminRole } from '../types/partner';

/**
 * Only the three areas that were ever gated behind role='admin' in the
 * first place (migration 0014) - see migration 0019's has_permission().
 * Orders/Partners/Top Sellers/Audit Log stay open to every admin_users
 * member regardless, and User Management itself is never a grantable
 * permission (self-escalation risk - see that migration's header note).
 */
export type StaffPermissions = {
  products?: boolean;
  promotions?: boolean;
  partner_pricing?: boolean;
};

export type StaffAccount = {
  user_id: string;
  role: AdminRole;
  email: string | null;
  full_name: string | null;
  permissions: StaffPermissions;
  created_at: string;
};

/** Every admin_users row - both roles, so a full admin can see who else has access. */
export async function listStaffAccounts(): Promise<StaffAccount[]> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, role, email, full_name, permissions, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...row, permissions: row.permissions ?? {} })) as StaffAccount[];
}

export type CreateStaffInput = {
  fullName: string;
  email: string;
  password: string;
  permissions?: StaffPermissions;
};

/**
 * A full admin creates a Staff account directly - purely username(=email)
 * and password, no email required. The account/password is always set;
 * emailing the credentials to the new staff member is a separate,
 * optional step (`sendEmail`, default off - staff work inside the admin
 * environment, so the admin just as often tells them in person). Server-
 * side checks the CALLER is role='admin' (not just any admin_users
 * member) - this is a thin wrapper, the real gate is in the Edge Function.
 */
export async function createStaffAccount(
  input: CreateStaffInput,
  sendEmail = false,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('grant-portal-access', {
    body: {
      mode: 'staff',
      fullName: input.fullName,
      email: input.email,
      password: input.password,
      permissions: input.permissions ?? {},
      sendEmail,
    },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error as string };
  return { error: null };
}

export type UpdateStaffInput = {
  staffUserId: string;
  fullName?: string;
  email?: string;
  password?: string;
  role?: AdminRole;
  permissions?: StaffPermissions;
};

/**
 * Edits an existing account - any subset of name/email/role/permissions,
 * plus an optional password reset. Only fields actually passed are
 * changed (see the Edge Function's update_staff mode) - leaving
 * `password` blank, for instance, leaves the current password untouched.
 */
export async function updateStaffAccount(
  input: UpdateStaffInput,
  sendEmail = false,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('grant-portal-access', {
    body: { mode: 'update_staff', ...input, sendEmail },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error as string };
  return { error: null };
}

/** Removes an account's admin_users row - the auth user itself is left alone, just cut off from the portal. */
export async function revokeStaffAccount(staffUserId: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('grant-portal-access', {
    body: { mode: 'revoke_staff', staffUserId },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error as string };
  return { error: null };
}
