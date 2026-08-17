import { supabase } from './supabase';
import type { AuditLogEntry } from '../types/auditLog';

export async function listAuditLog(limit = 300): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data as AuditLogEntry[];
}
