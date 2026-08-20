import { useEffect, useState } from 'react';
import { citiesForRegion, fetchBarangaysForCity, fetchPhLocationTree } from '../../lib/phLocations';
import type { PhCityOption, PhRegion } from '../../lib/phLocations';
import type { PartnerType } from '../../types/partner';

export type TerritoryPickerValue = { territoryId: string; barangayName: string | null };

const selectClass =
  'w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white focus:border-lf-gold focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70';

/**
 * Real Region -> City -> Barangay picker (migration 0012), shared by
 * partner-assisted onboarding (Route B) and admin's own "Add Partner"
 * form. How many steps show depends on partnerType, per
 * resolve_and_reserve_territory()'s level requirement (migration 0016):
 * Franchise stops at City (territoryId = the city id), Distributor and
 * Reseller both go all the way to Barangay (territoryId = the city id
 * the barangay belongs to, paired with the raw barangayName - the
 * barangay itself may not exist as a row yet, the server lazily creates
 * it). No capacity limit on any partner type (client decision) - the
 * picker is a plain unrestricted dropdown at every step, nothing here
 * checks or displays occupancy.
 *
 * `lockedRegionId`/`lockedCityId` are Route B's containment mechanism
 * (Part 2 §28) for a sponsor onboarding within their own coverage area -
 * currently unused by any caller (containment was deferred pending a
 * redesign now that Franchise/Distributor's own territory levels changed,
 * see migration 0016), left in place in case that comes back.
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
  const needsBarangay = partnerType === 'distributor' || partnerType === 'reseller';

  const [tree, setTree] = useState<PhRegion[] | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);

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
  }, [lockedCityId]);

  useEffect(() => {
    if (lockedCityId) return;
    setCityId('');
    setBarangayName('');
    setBarangayOptions(null);
    onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

  useEffect(() => {
    setBarangayName('');
    if (!effectiveCityId || !needsBarangay) {
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
    if (needsBarangay && effectiveCityId && barangayName) {
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
            {barangayOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
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
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {effectiveRegionId && (
        <div>
          <label className={labelClass}>City / Municipality</label>
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} className={selectClass}>
            <option value="">Select…</option>
            {cityOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </div>
      )}

      {needsBarangay && effectiveCityId && (
        <div>
          <label className={labelClass}>Barangay</label>
          {barangayLoadError && <p className="text-xs text-lf-error">{barangayLoadError}</p>}
          {!barangayOptions && !barangayLoadError && (
            <p className="text-xs text-lf-cream/50">Loading barangays…</p>
          )}
          {barangayOptions && (
            <select value={barangayName} onChange={(e) => setBarangayName(e.target.value)} className={selectClass}>
              <option value="">Select…</option>
              {barangayOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
