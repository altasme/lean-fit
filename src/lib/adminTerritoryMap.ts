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

/**
 * Collapses the region -> province -> city -> barangay tree down to
 * region -> city -> barangay for display - province is purely structural
 * (migration 0012, disambiguates same-named cities across provinces
 * within a region) and never partner-assignable, so it has no place in
 * an admin-facing hierarchy that only ever means to show "who's where".
 * Each region's children become the union of all its provinces' cities;
 * nothing about a region's own occupancy changes.
 */
export function flattenSkipProvince(roots: TerritoryNode[]): TerritoryNode[] {
  return roots.map((region) => {
    if (region.level !== 'region') return region;
    const cities = region.children
      .flatMap((province) => province.children)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    return { ...region, children: cities };
  });
}

export type PartnerTypeCounts = { franchise: number; distributor: number; reseller: number };

/**
 * Franchise/Distributor/Reseller totals for one region, aggregated from
 * the (already province-flattened) tree - a region's own occupiedCount is
 * its Franchise count, each direct city child's occupiedCount is a
 * Distributor count, each barangay grandchild's occupiedCount is a
 * Reseller count. Territory level <-> partner type is a strict 1:1
 * mapping (spec Part 1 §7), so this never double-counts.
 */
export function countPartnerTypesInRegion(region: TerritoryNode): PartnerTypeCounts {
  let distributor = 0;
  let reseller = 0;
  for (const city of region.children) {
    distributor += city.occupiedCount;
    for (const barangay of city.children) {
      reseller += barangay.occupiedCount;
    }
  }
  return { franchise: region.occupiedCount, distributor, reseller };
}

/** Sitewide Franchise/Distributor/Reseller totals - the Territory Map's summary strip. */
export function countPartnerTypesTotal(flatRegions: TerritoryNode[]): PartnerTypeCounts {
  return flatRegions.reduce<PartnerTypeCounts>(
    (acc, region) => {
      const c = countPartnerTypesInRegion(region);
      return {
        franchise: acc.franchise + c.franchise,
        distributor: acc.distributor + c.distributor,
        reseller: acc.reseller + c.reseller,
      };
    },
    { franchise: 0, distributor: 0, reseller: 0 },
  );
}
