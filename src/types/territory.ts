// 'province' added by migration 0012, purely structural - it disambiguates
// same-named cities across provinces within a region (25 real collisions
// confirmed against the PSGC source data), never assignable to a partner.
export type TerritoryLevel = 'region' | 'province' | 'city' | 'barangay';

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
  province: 'Province',
  city: 'City / Municipality',
  barangay: 'Barangay',
};

/**
 * Which partner type(s) occupy which territory level. No longer 1:1 -
 * Distributor and Reseller are both barangay-level now, with independent
 * capacity per barangay (a barangay can have an active Distributor AND an
 * active Reseller at once - see migration 0016). Franchise is city-level
 * (moved down from region). Region/province have no entry - never
 * directly assignable to a partner.
 */
export const TERRITORY_LEVEL_PARTNER_TYPES = {
  city: ['franchise'],
  barangay: ['distributor', 'reseller'],
} as const;

/** Reverse of the above - which territory level a given partner type is assigned at. */
export const PARTNER_TYPE_TERRITORY_LEVEL = {
  franchise: 'city',
  distributor: 'barangay',
  reseller: 'barangay',
} as const;
