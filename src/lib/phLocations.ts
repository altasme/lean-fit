// Real Philippine region/province/city/barangay data (PSGC 2019v2), see
// migration 0012 for the seeding decision. Region/province/city come from
// a small bundled tree (public/data/ph-locations.json, ~115KB, fetched
// once and cached); barangay names come from a larger bundled lookup
// (public/data/ph-barangays.json, ~750KB, fetched lazily only once a
// Reseller applicant reaches the barangay step - most applicants never
// trigger it).

export type PhCity = { id: string; name: string };
export type PhProvince = { id: string; name: string; cities: PhCity[] };
export type PhRegion = { id: string; name: string; provinces: PhProvince[] };

let treeCache: PhRegion[] | null = null;
let treePromise: Promise<PhRegion[]> | null = null;

export async function fetchPhLocationTree(): Promise<PhRegion[]> {
  if (treeCache) return treeCache;
  if (!treePromise) {
    treePromise = fetch('/data/ph-locations.json').then((r) => {
      if (!r.ok) throw new Error('Failed to load location data.');
      return r.json() as Promise<PhRegion[]>;
    });
  }
  treeCache = await treePromise;
  return treeCache;
}

type PhBarangaysFile = Record<string, { barangays: string[] }>;

let barangaysCache: PhBarangaysFile | null = null;
let barangaysPromise: Promise<PhBarangaysFile> | null = null;

export async function fetchBarangaysForCity(cityId: string): Promise<string[]> {
  if (!barangaysCache) {
    if (!barangaysPromise) {
      barangaysPromise = fetch('/data/ph-barangays.json').then((r) => {
        if (!r.ok) throw new Error('Failed to load barangay data.');
        return r.json() as Promise<PhBarangaysFile>;
      });
    }
    barangaysCache = await barangaysPromise;
  }
  return barangaysCache[cityId]?.barangays ?? [];
}

export type PhProvinceOption = { id: string; name: string };

/**
 * Flat, nationwide province list (86, sorted) for the lead form's simple
 * Province -> City picker (item #7 - no region context shown, no live
 * capacity check needed since a lead isn't reserving a territory).
 * Province names don't collide nationally (unlike the 25 real city-name
 * collisions within a region), so a flat list is unambiguous.
 */
export async function fetchAllProvinces(): Promise<PhProvinceOption[]> {
  const tree = await fetchPhLocationTree();
  return tree
    .flatMap((r) => r.provinces.map((p) => ({ id: p.id, name: p.name })))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchCitiesForProvince(provinceId: string): Promise<PhCity[]> {
  const tree = await fetchPhLocationTree();
  for (const region of tree) {
    const province = region.provinces.find((p) => p.id === provinceId);
    if (province) return province.cities.slice().sort((a, b) => a.name.localeCompare(b.name));
  }
  return [];
}

export type PhCityOption = { id: string; name: string; provinceName: string; displayName: string };

/**
 * Cities within a region, flattened across provinces (province itself
 * isn't a separate picker step - see migration 0012's UX note). Only
 * appends "(Province)" to the label when a name collides within the
 * region - 25 real cases in the source data, e.g. "SAN NICOLAS" exists in
 * both Ilocos Norte and Pangasinan (Region I) - everyone else keeps the
 * plain name.
 */
export function citiesForRegion(region: PhRegion): PhCityOption[] {
  const all = region.provinces.flatMap((p) => p.cities.map((c) => ({ ...c, provinceName: p.name })));
  const nameCounts = new Map<string, number>();
  for (const c of all) nameCounts.set(c.name, (nameCounts.get(c.name) ?? 0) + 1);

  return all
    .map((c) => ({
      id: c.id,
      name: c.name,
      provinceName: c.provinceName,
      displayName: (nameCounts.get(c.name) ?? 0) > 1 ? `${c.name} (${c.provinceName})` : c.name,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
