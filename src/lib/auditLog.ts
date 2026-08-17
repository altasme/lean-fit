import { supabase } from './supabase';

export type AuditEntityType = 'product' | 'promotion' | 'partner_pricing' | 'media' | 'order' | 'payment';

async function currentAdminId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Records an admin action to the central audit_log (spec §17-19). Best
 * effort - a logging failure must never block or roll back the mutation
 * it's describing, so errors are reported to the console rather than
 * thrown.
 */
export async function writeAuditLog(entry: {
  entity_type: AuditEntityType;
  entity_id: string;
  action: string;
  field?: string;
  previous_value?: string | null;
  new_value?: string | null;
  note?: string;
}): Promise<void> {
  const changed_by = await currentAdminId();
  const { error } = await supabase.from('audit_log').insert({ ...entry, changed_by });
  if (error) {
    console.error('Failed to write audit log entry:', error.message, entry);
  }
}

/** Compares `before`/`after` field-by-field and writes one audit_log row per changed field. */
export async function logFieldChanges<T extends Record<string, unknown>>(
  entityType: AuditEntityType,
  entityId: string,
  before: T,
  after: T,
  fields: { key: keyof T; label: string }[],
): Promise<void> {
  for (const { key, label } of fields) {
    const prev = before[key];
    const next = after[key];
    if (prev === next) continue;
    if (JSON.stringify(prev) === JSON.stringify(next)) continue;

    await writeAuditLog({
      entity_type: entityType,
      entity_id: entityId,
      action: 'updated',
      field: label,
      previous_value: prev == null ? null : String(prev),
      new_value: next == null ? null : String(next),
    });
  }
}
