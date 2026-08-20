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
    body: { mode: 'staff', fullName: input.fullName, email: input.email, password: input.password, sendEmail },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error as string };
  return { error: null };
}
