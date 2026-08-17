import { supabase } from './supabase';
import type { Territory } from '../types/territory';
import type { PartnerStatus } from '../types/partner';

export type TerritoryOccupant = { id: string; full_name: string; status: PartnerStatus };

export type TerritoryNode = Territory & {
  occupants: TerritoryOccupant[];
  /** Active occupants only - matches the capacity rule elsewhere (Phase G): a
   *  suspended partner doesn't count against/represent live coverage. */
  occupiedCount: number;
  children: TerritoryNode[];
};

/**
 * Builds the full region -> city -> barangay tree in one pass, each node
 * carrying its own occupants (spec Part 1 §12-14's "map objective" - who
 * covers what, where's vacant, what's full). No literal geographic
 * rendering - see supabase/README.md's Phase H note on why (no
 * barangay-level boundary data available) - this is the strategic
 * coverage view instead, same information, tree/list presentation.
 */
export async function fetchTerritoryTree(): Promise<TerritoryNode[]> {
  const [{ data: territories, error: tError }, { data: partners, error: pError }] = await Promise.all([
    supabase.from('territories').select('*'),
    supabase.from('partners').select('id, full_name, status, territory_id').not('territory_id', 'is', null),
  ]);
  if (tError) throw new Error(tError.message);
  if (pError) throw new Error(pError.message);

  const occupantsByTerritory = new Map<string, TerritoryOccupant[]>();
  for (const p of (partners ?? []) as { id: string; full_name: string; status: PartnerStatus; territory_id: string }[]) {
    const list = occupantsByTerritory.get(p.territory_id) ?? [];
    list.push({ id: p.id, full_name: p.full_name, status: p.status });
    occupantsByTerritory.set(p.territory_id, list);
  }

  const nodesById = new Map<string, TerritoryNode>();
  for (const t of territories as Territory[]) {
    const occupants = occupantsByTerritory.get(t.id) ?? [];
    nodesById.set(t.id, {
      ...t,
      occupants,
      occupiedCount: occupants.filter((o) => o.status === 'active').length,
      children: [],
    });
  }

  const roots: TerritoryNode[] = [];
  for (const node of nodesById.values()) {
    const parent = node.parent_id ? nodesById.get(node.parent_id) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const byName = (a: TerritoryNode, b: TerritoryNode) => a.name.localeCompare(b.name);
  const sortTree = (nodes: TerritoryNode[]) => {
    nodes.sort(byName);
    nodes.forEach((n) => sortTree(n.children));
  };
  sortTree(roots);

  return roots;
}

export type CoverageBucket = { total: number; occupied: number; vacant: number };
export type TerritoryCoverageStats = {
  region: CoverageBucket;
  city: CoverageBucket;
  barangay: CoverageBucket;
};

/** Spec §59's strategic summary: coverage counts per level, walked from the tree. */
export function summarizeCoverage(roots: TerritoryNode[]): TerritoryCoverageStats {
  const stats: TerritoryCoverageStats = {
    region: { total: 0, occupied: 0, vacant: 0 },
    city: { total: 0, occupied: 0, vacant: 0 },
    barangay: { total: 0, occupied: 0, vacant: 0 },
  };

  function walk(node: TerritoryNode) {
    const bucket = stats[node.level];
    bucket.total += 1;
    if (node.occupiedCount > 0) bucket.occupied += 1;
    else bucket.vacant += 1;
    node.children.forEach(walk);
  }
  roots.forEach(walk);

  return stats;
}

export type VacantTerritory = { id: string; name: string; level: Territory['level']; parentName: string | null };

/** Spec §59's "potential expansion areas" - every territory with zero active occupants. */
export function findVacantTerritories(roots: TerritoryNode[]): VacantTerritory[] {
  const result: VacantTerritory[] = [];

  function walk(node: TerritoryNode, parentName: string | null) {
    if (node.occupiedCount === 0) {
      result.push({ id: node.id, name: node.name, level: node.level, parentName });
    }
    node.children.forEach((child) => walk(child, node.name));
  }
  roots.forEach((r) => walk(r, null));

  return result;
}
