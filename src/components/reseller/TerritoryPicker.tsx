import { useEffect, useState } from 'react';
import { citiesForRegion, fetchBarangaysForCity, fetchPhLocationTree } from '../../lib/phLocations';
import type { PhCityOption, PhRegion } from '../../lib/phLocations';
import { fetchTerritoriesWithOccupancy } from '../../lib/partners';
import type { TerritoryOption } from '../../lib/partners';
import type { PartnerType } from '../../types/partner';

export type TerritoryPickerValue = { territoryId: string; barangayName: string | null };

const selectClass =
  'w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white focus:border-lf-gold focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70';

function withCapacityLabel(name: string, occ?: TerritoryOption) {
  if (!occ || occ.capacity == null) return name;
  const full = occ.occupied >= occ.capacity;
  return `${name} (${occ.occupied}/${occ.capacity}${full ? ' - Full' : ''})`;
}

/**
 * Real Region -> City -> Barangay picker (migration 0012), shared by the
 * public application (Route A) and partner-assisted onboarding (Route B).
 * How many steps show depends on partnerType, per resolve_and_reserve_
 * territory()'s level requirement: Franchise stops at Region (territoryId
 * = the region id), Distributor stops at City (territoryId = the city
 * id), Reseller goes all the way to Barangay (territoryId = the city id
 * that barangay belongs to, paired with the raw barangayName - the
 * barangay itself may not exist as a row yet, the server lazily creates
 * it).
 *
 * `lockedRegionId`/`lockedCityId` are Route B's containment mechanism
 * (Part 2 §28) - a sponsor's own coverage area is fixed, not chosen, so
 * onboard_partner() would reject anything else server-side anyway. Passing
 * one hides that step's UI entirely rather than merely filtering options:
 * a Franchise always onboards within their own region (locks region, still
 * picks city/barangay); a Distributor always onboards a Reseller within
 * their own city (locks city, only picks barangay).
 */
export function TerritoryPicker({
  partnerType,
  onChange,
  lockedRegionId,
  lockedCityId,
}: {
  partnerType: PartnerType;
  onChange: (value: TerritoryPickerValue | null) => void;
  lockedRegionId?: string;
  lockedCityId?: string;
}) {
  const [tree, setTree] = useState<PhRegion[] | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [regionOccupancy, setRegionOccupancy] = useState<TerritoryOption[] | null>(null);
  const [cityOccupancy, setCityOccupancy] = useState<TerritoryOption[] | null>(null);
  const [barangayOccupancy, setBarangayOccupancy] = useState<TerritoryOption[] | null>(null);

  const [regionId, setRegionId] = useState('');
  const [cityId, setCityId] = useState('');
  const [barangayName, setBarangayName] = useState('');
  const [barangayOptions, setBarangayOptions] = useState<string[] | null>(null);
  const [barangayLoadError, setBarangayLoadError] = useState<string | null>(null);

  const effectiveRegionId = lockedRegionId ?? regionId;
  const effectiveCityId = lockedCityId ?? cityId;

  useEffect(() => {
    if (!lockedCityId) {
      fetchPhLocationTree()
        .then(setTree)
        .catch((err) => setTreeError(err instanceof Error ? err.message : 'Failed to load locations.'));
    }
    // Capacity only matters for the level the applicant is actually
    // claiming for THEMSELVES - a locked step is already an approved,
    // active partner's territory, not a fresh claim, so it's skipped.
    if (partnerType === 'franchise' && !lockedRegionId) {
      fetchTerritoriesWithOccupancy('region').then(setRegionOccupancy).catch(() => setRegionOccupancy(null));
    }
    if (partnerType === 'distributor' && !lockedCityId) {
      fetchTerritoriesWithOccupancy('city').then(setCityOccupancy).catch(() => setCityOccupancy(null));
    }
    if (partnerType === 'reseller') {
      fetchTerritoriesWithOccupancy('barangay').then(setBarangayOccupancy).catch(() => setBarangayOccupancy(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerType]);

  useEffect(() => {
    if (lockedCityId) return;
    setCityId('');
    setBarangayName('');
    setBarangayOptions(null);
    if (partnerType === 'franchise') {
      onChange(regionId ? { territoryId: regionId, barangayName: null } : null);
    } else {
      onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

  useEffect(() => {
    if (partnerType === 'franchise') return;
    setBarangayName('');
    if (!effectiveCityId || partnerType !== 'reseller') {
      onChange(effectiveCityId ? { territoryId: effectiveCityId, barangayName: null } : null);
      return;
    }
    setBarangayOptions(null);
    setBarangayLoadError(null);
    fetchBarangaysForCity(effectiveCityId)
      .then(setBarangayOptions)
      .catch((err) => setBarangayLoadError(err instanceof Error ? err.message : 'Failed to load barangays.'));
    onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCityId]);

  useEffect(() => {
    if (partnerType === 'reseller' && effectiveCityId && barangayName) {
      onChange({ territoryId: effectiveCityId, barangayName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barangayName]);

  if (lockedCityId) {
    return (
      <div>
        <label className={labelClass}>Barangay</label>
        {barangayLoadError && <p className="text-xs text-lf-error">{barangayLoadError}</p>}
        {!barangayOptions && !barangayLoadError && (
          <p className="text-xs text-lf-cream/50">Loading barangays…</p>
        )}
        {barangayOptions && (
          <select value={barangayName} onChange={(e) => setBarangayName(e.target.value)} className={selectClass}>
            <option value="">Select…</option>
            {barangayOptions.map((name) => {
              const occ = barangayOccupancy?.find(
                (o) => o.name.toUpperCase() === name.toUpperCase() && o.parentId === lockedCityId,
              );
              const full = Boolean(occ && occ.capacity != null && occ.occupied >= occ.capacity);
              return (
                <option key={name} value={name} disabled={full}>
                  {withCapacityLabel(name, occ)}
                </option>
              );
            })}
          </select>
        )}
      </div>
    );
  }

  if (treeError) return <p className="text-xs text-lf-error">{treeError}</p>;
  if (!tree) return <p className="text-xs text-lf-cream/50">Loading locations…</p>;

  const selectedRegion = tree.find((r) => r.id === effectiveRegionId) ?? null;
  const cityOptions: PhCityOption[] = selectedRegion ? citiesForRegion(selectedRegion) : [];

  return (
    <div className="space-y-4">
      {!lockedRegionId && (
        <div>
          <label className={labelClass}>Region</label>
          <select value={regionId} onChange={(e) => setRegionId(e.target.value)} className={selectClass}>
            <option value="">Select…</option>
            {tree
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((r) => {
                const occ = regionOccupancy?.find((o) => o.id === r.id);
                const full = Boolean(occ && occ.capacity != null && occ.occupied >= occ.capacity);
                return (
                  <option key={r.id} value={r.id} disabled={partnerType === 'franchise' && full}>
                    {withCapacityLabel(r.name, partnerType === 'franchise' ? occ : undefined)}
                  </option>
                );
              })}
          </select>
        </div>
      )}

      {partnerType !== 'franchise' && effectiveRegionId && (
        <div>
          <label className={labelClass}>City / Municipality</label>
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} className={selectClass}>
            <option value="">Select…</option>
            {cityOptions.map((c) => {
              const occ = cityOccupancy?.find((o) => o.id === c.id);
              const full = Boolean(occ && occ.capacity != null && occ.occupied >= occ.capacity);
              return (
                <option key={c.id} value={c.id} disabled={partnerType === 'distributor' && full}>
                  {withCapacityLabel(c.displayName, partnerType === 'distributor' ? occ : undefined)}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {partnerType === 'reseller' && effectiveCityId && (
        <div>
          <label className={labelClass}>Barangay</label>
          {barangayLoadError && <p className="text-xs text-lf-error">{barangayLoadError}</p>}
          {!barangayOptions && !barangayLoadError && (
            <p className="text-xs text-lf-cream/50">Loading barangays…</p>
          )}
          {barangayOptions && (
            <select value={barangayName} onChange={(e) => setBarangayName(e.target.value)} className={selectClass}>
              <option value="">Select…</option>
              {barangayOptions.map((name) => {
                const occ = barangayOccupancy?.find(
                  (o) => o.name.toUpperCase() === name.toUpperCase() && o.parentId === effectiveCityId,
                );
                const full = Boolean(occ && occ.capacity != null && occ.occupied >= occ.capacity);
                return (
                  <option key={name} value={name} disabled={full}>
                    {withCapacityLabel(name, occ)}
                  </option>
                );
              })}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
