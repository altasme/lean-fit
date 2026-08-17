export type TerritoryLevel = 'region' | 'city' | 'barangay';

export type Territory = {
  id: string;
  level: TerritoryLevel;
  name: string;
  parent_id: string | null;
  capacity: number | null;
  created_at: string;
  updated_at: string;
};

export const TERRITORY_LEVEL_LABELS: Record<TerritoryLevel, string> = {
  region: 'Region',
  city: 'City / Municipality',
  barangay: 'Barangay',
};

/** Which partner type occupies which territory level - spec Part 1 §7 (strict 1:1 mapping). */
export const TERRITORY_LEVEL_PARTNER_TYPE = {
  region: 'franchise',
  city: 'distributor',
  barangay: 'reseller',
} as const;

/** Reverse of the above - which territory level a given partner type is assigned at. */
export const PARTNER_TYPE_TERRITORY_LEVEL = {
  franchise: 'region',
  distributor: 'city',
  reseller: 'barangay',
} as const;
