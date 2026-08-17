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
