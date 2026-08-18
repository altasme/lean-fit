import { supabase } from './supabase';
import type { AdminRole } from '../types/partner';

export type StaffAccount = {
  user_id: string;
  role: AdminRole;
  email: string | null;
  full_name: string | null;
  created_at: string;
};

/** Every admin_users row - both roles, so a full admin can see who else has access. */
export async function listStaffAccounts(): Promise<StaffAccount[]> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, role, email, full_name, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as StaffAccount[];
}

export type CreateStaffInput = { fullName: string; email: string; password: string };

/**
 * Item #5 - a full admin creates a Staff account directly, admin sets the
 * password (no email-invite-link flow), credentials emailed to the new
 * staff member via grant-portal-access (mode: 'staff'). Server-side
 * checks the CALLER is role='admin' (not just any admin_users member) -
 * this is a thin wrapper, the real gate is in the Edge Function.
 */
export async function createStaffAccount(input: CreateStaffInput): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('grant-portal-access', {
    body: { mode: 'staff', fullName: input.fullName, email: input.email, password: input.password },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error as string };
  return { error: null };
}
