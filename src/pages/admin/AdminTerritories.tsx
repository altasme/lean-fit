import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useToast } from '../../components/ui/Toast';
import {
  createTerritory,
  deleteTerritory,
  resolveBarangayTerritory,
  updateTerritoryCapacity,
} from '../../lib/adminTerritories';
import { fetchTerritoryTree, flattenSkipProvince } from '../../lib/adminTerritoryMap';
import type { TerritoryNode } from '../../lib/adminTerritoryMap';

const inputClass =
  'rounded-sm border border-white/15 bg-lf-black px-3 py-2 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none';
const rowBase = 'flex flex-wrap items-center gap-3 border-b border-white/5 py-3 last:border-0';

function CapacityInput({ node, onSave }: { node: TerritoryNode; onSave: (value: number | null) => void }) {
  const [value, setValue] = useState(node.capacity ?? '');
  return (
    <input
      type="number"
      min={1}
      placeholder="Unlimited"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const next = value === '' ? null : Number(value);
        if (next !== (node.capacity ?? null)) onSave(next);
      }}
      className={`${inputClass} tabular w-28 !py-1.5`}
    />
  );
}

function AddChildForm({
  placeholder,
  onAdd,
  busy,
}: {
  placeholder: string;
  onAdd: (name: string, capacity: number | null) => Promise<void>;
  busy: boolean;
}) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd(name.trim(), capacity.trim() === '' ? null : Number(capacity));
    setName('');
    setCapacity('');
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 py-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} min-w-[200px] flex-1`}
      />
      <input
        type="number"
        min={1}
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        placeholder="Capacity (blank = unlimited)"
        className={`${inputClass} tabular w-48`}
      />
      <button type="submit" disabled={busy || !name.trim()} className="btn-outline !px-4 !py-2 !text-xs disabled:opacity-50">
        Add
      </button>
    </form>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      type="button"
      onClick={onDelete}
      className="text-xs text-lf-cream/40 hover:text-lf-error"
      title="Delete"
    >
      Delete
    </button>
  );
}

export default function AdminTerritories() {
  const { showToast } = useToast();
  const [regions, setRegions] = useState<TerritoryNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const [expandedCity, setExpandedCity] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState('');
  const [barangaySearch, setBarangaySearch] = useState('');
  const [newRegionName, setNewRegionName] = useState('');

  function load() {
    fetchTerritoryTree()
      .then((roots) => setRegions(flattenSkipProvince(roots)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load territories.'));
  }

  useEffect(load, []);

  async function handleAddRegion(e: React.FormEvent) {
    e.preventDefault();
    if (!newRegionName.trim()) return;
    setBusy(true);
    try {
      await createTerritory({ level: 'region', name: newRegionName.trim().toUpperCase(), parent_id: null, capacity: null });
      showToast(`${newRegionName.trim()} added.`);
      setNewRegionName('');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add region.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddCity(regionId: string, name: string, capacity: number | null) {
    setBusy(true);
    try {
      await createTerritory({ level: 'city', name: name.toUpperCase(), parent_id: regionId, capacity });
      showToast(`${name} added.`);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add city.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddBarangay(cityId: string, name: string, capacity: number | null) {
    setBusy(true);
    try {
      const id = await resolveBarangayTerritory(name.toUpperCase(), cityId);
      if (capacity !== null) await updateTerritoryCapacity(id, capacity);
      showToast(`${name} added.`);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add barangay.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleCapacityChange(id: string, capacity: number | null) {
    try {
      await updateTerritoryCapacity(id, capacity);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update capacity.', 'error');
    }
  }

  async function handleDelete(node: TerritoryNode) {
    try {
      await deleteTerritory(node.id);
      showToast(`${node.name} deleted.`);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete territory.', 'error');
    }
  }

  return (
    <AdminLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Territories</h1>
      <p className="mt-2 max-w-2xl text-sm text-lf-cream/60">
        Regions hold Franchises, cities hold Distributors, barangays hold Resellers (spec Part 1
        §7/§9). Click a region to reveal its cities, click a city to reveal its barangays -
        capacity limits how many active partners may occupy a territory, leave blank for unlimited.
      </p>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}
      {!regions && !error && <p className="mt-6 text-sm text-lf-cream/60">Loading…</p>}

      {regions && (
        <div className="mt-6 rounded-sm border border-white/10 bg-lf-charcoal">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Regions</h2>
            <form onSubmit={handleAddRegion} className="flex items-center gap-2">
              <input
                value={newRegionName}
                onChange={(e) => setNewRegionName(e.target.value)}
                placeholder="Add region…"
                className={`${inputClass} !py-1.5`}
              />
              <button
                type="submit"
                disabled={busy || !newRegionName.trim()}
                className="btn-outline !px-3 !py-1.5 !text-xs disabled:opacity-50"
              >
                Add
              </button>
            </form>
          </div>

          <div className="px-5">
            {regions.length === 0 && <p className="py-6 text-sm text-lf-cream/50">No regions yet.</p>}

            {regions.map((region) => {
              const isOpen = expandedRegion === region.id;
              const cities = isOpen
                ? region.children.filter((c) => c.name.toLowerCase().includes(citySearch.trim().toLowerCase()))
                : [];

              return (
                <div key={region.id} className={rowBase.replace('items-center', 'items-start')}>
                  <div className="w-full">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedRegion(isOpen ? null : region.id);
                          setExpandedCity(null);
                          setCitySearch('');
                        }}
                        className="flex min-w-[180px] flex-1 items-center gap-3 py-1 text-left text-lf-white hover:text-lf-gold"
                      >
                        <span className="w-4 shrink-0 text-xs text-lf-cream/50">{isOpen ? '▾' : '▸'}</span>
                        <span className="text-sm font-medium">{region.name}</span>
                      </button>
                      <span className="text-xs text-lf-cream/50">
                        {region.occupiedCount} Franchise{region.occupiedCount === 1 ? '' : 's'} ·{' '}
                        {region.children.length} {region.children.length === 1 ? 'city' : 'cities'}
                      </span>
                      <CapacityInput node={region} onSave={(v) => handleCapacityChange(region.id, v)} />
                      <DeleteButton onDelete={() => handleDelete(region)} />
                    </div>

                    {isOpen && (
                      <div className="mt-3 ml-7 border-l border-white/10 pl-4">
                        {region.children.length > 8 && (
                          <input
                            value={citySearch}
                            onChange={(e) => setCitySearch(e.target.value)}
                            placeholder={`Search ${region.children.length} cities…`}
                            className={`${inputClass} mb-2 w-full max-w-xs !py-1.5`}
                          />
                        )}

                        <div className="max-h-[360px] overflow-y-auto">
                          {cities.length === 0 && (
                            <p className="py-2 text-xs text-lf-cream/40">
                              {citySearch ? 'No matching cities.' : 'No cities yet.'}
                            </p>
                          )}
                          {cities.map((city) => {
                            const cityOpen = expandedCity === city.id;
                            const barangays = cityOpen
                              ? city.children.filter((b) =>
                                  b.name.toLowerCase().includes(barangaySearch.trim().toLowerCase()),
                                )
                              : [];

                            return (
                              <div key={city.id} className="border-b border-white/5 py-2 last:border-0">
                                <div className="flex flex-wrap items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpandedCity(cityOpen ? null : city.id);
                                      setBarangaySearch('');
                                    }}
                                    className="flex min-w-[160px] flex-1 items-center gap-3 py-1 text-left text-lf-white hover:text-lf-gold"
                                  >
                                    <span className="w-4 shrink-0 text-xs text-lf-cream/50">{cityOpen ? '▾' : '▸'}</span>
                                    <span className="text-sm">{city.name}</span>
                                  </button>
                                  <span className="text-xs text-lf-cream/50">
                                    {city.occupiedCount} Distributor{city.occupiedCount === 1 ? '' : 's'} ·{' '}
                                    {city.children.length} barangay{city.children.length === 1 ? '' : 's'} added
                                  </span>
                                  <CapacityInput node={city} onSave={(v) => handleCapacityChange(city.id, v)} />
                                  <DeleteButton onDelete={() => handleDelete(city)} />
                                </div>

                                {cityOpen && (
                                  <div className="mt-2 ml-7 border-l border-white/10 pl-4">
                                    {city.children.length > 8 && (
                                      <input
                                        value={barangaySearch}
                                        onChange={(e) => setBarangaySearch(e.target.value)}
                                        placeholder={`Search ${city.children.length} barangays…`}
                                        className={`${inputClass} mb-2 w-full max-w-xs !py-1.5`}
                                      />
                                    )}
                                    <div className="max-h-[280px] overflow-y-auto">
                                      {barangays.length === 0 && (
                                        <p className="py-2 text-xs text-lf-cream/40">
                                          {barangaySearch ? 'No matching barangays.' : 'No barangays added yet.'}
                                        </p>
                                      )}
                                      {barangays.map((barangay) => (
                                        <div key={barangay.id} className="flex flex-wrap items-center gap-3 py-1.5">
                                          <span className="min-w-[160px] flex-1 text-sm text-lf-cream/90">
                                            {barangay.name}
                                          </span>
                                          <span className="text-xs text-lf-cream/50">
                                            {barangay.occupiedCount > 0 ? 'Occupied' : 'Vacant'}
                                          </span>
                                          <CapacityInput
                                            node={barangay}
                                            onSave={(v) => handleCapacityChange(barangay.id, v)}
                                          />
                                          <DeleteButton onDelete={() => handleDelete(barangay)} />
                                        </div>
                                      ))}
                                    </div>
                                    <AddChildForm
                                      placeholder="Add barangay…"
                                      busy={busy}
                                      onAdd={(name, capacity) => handleAddBarangay(city.id, name, capacity)}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <AddChildForm
                          placeholder="Add city / municipality…"
                          busy={busy}
                          onAdd={(name, capacity) => handleAddCity(region.id, name, capacity)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
