import { supabase } from './supabase';
import { writeAuditLog } from './auditLog';
import type { Territory, TerritoryLevel } from '../types/territory';

export type TerritoryWithOccupancy = Territory & { occupiedCount: number };

/**
 * Occupancy is always computed live (count of `active` partners currently
 * pointing at each territory), never stored - avoids a denormalized
 * counter that could drift out of sync with suspensions/reassignments.
 */
export async function listTerritories(): Promise<TerritoryWithOccupancy[]> {
  const [{ data: territories, error: tError }, { data: partners, error: pError }] = await Promise.all([
    supabase.from('territories').select('*').order('level').order('name'),
    supabase.from('partners').select('territory_id').eq('status', 'active'),
  ]);
  if (tError) throw new Error(tError.message);
  if (pError) throw new Error(pError.message);

  const countByTerritory = new Map<string, number>();
  for (const p of (partners ?? []) as { territory_id: string | null }[]) {
    if (!p.territory_id) continue;
    countByTerritory.set(p.territory_id, (countByTerritory.get(p.territory_id) ?? 0) + 1);
  }

  return (territories as Territory[]).map((t) => ({
    ...t,
    occupiedCount: countByTerritory.get(t.id) ?? 0,
  }));
}

export type TerritoryInput = {
  level: TerritoryLevel;
  name: string;
  parent_id: string | null;
  capacity: number | null;
};

export async function createTerritory(input: TerritoryInput): Promise<Territory> {
  const { data, error } = await supabase.from('territories').insert(input).select().single();
  if (error) throw new Error(error.message);

  const territory = data as Territory;
  await writeAuditLog({
    entity_type: 'territory',
    entity_id: territory.id,
    action: 'created',
    note: `${territory.name} (${territory.level})`,
  });
  return territory;
}

export async function updateTerritoryCapacity(id: string, capacity: number | null): Promise<void> {
  const { error } = await supabase.from('territories').update({ capacity }).eq('id', id);
  if (error) throw new Error(error.message);

  await writeAuditLog({
    entity_type: 'territory',
    entity_id: id,
    action: 'updated',
    field: 'Capacity',
    new_value: capacity === null ? 'Unlimited' : String(capacity),
  });
}

/**
 * Territories are protected by a plain FK (no ON DELETE CASCADE) from
 * both child territories (`parent_id`) and assigned partners
 * (`territory_id`) - Postgres blocks the delete outright rather than
 * silently orphaning either, so this just surfaces that as a readable
 * message instead of a raw constraint-violation string.
 */
export async function deleteTerritory(id: string): Promise<void> {
  const { error } = await supabase.from('territories').delete().eq('id', id);
  if (error) {
    if (error.message.toLowerCase().includes('foreign key')) {
      throw new Error(
        'This territory still has sub-territories or an assigned partner - reassign or remove those first.',
      );
    }
    throw new Error(error.message);
  }

  await writeAuditLog({ entity_type: 'territory', entity_id: id, action: 'deleted' });
}
