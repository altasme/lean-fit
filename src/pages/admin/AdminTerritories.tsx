import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useToast } from '../../components/ui/Toast';
import {
  createTerritory,
  deleteTerritory,
  listTerritories,
  updateTerritoryCapacity,
} from '../../lib/adminTerritories';
import type { TerritoryWithOccupancy } from '../../lib/adminTerritories';
import { TERRITORY_LEVEL_LABELS } from '../../types/territory';
import type { TerritoryLevel } from '../../types/territory';

const LEVELS: TerritoryLevel[] = ['region', 'city', 'barangay'];
const TERRITORY_LEVEL_PLURAL_LABELS: Record<TerritoryLevel, string> = {
  region: 'Regions',
  city: 'Cities / Municipalities',
  barangay: 'Barangays',
};
const PARENT_LEVEL: Record<TerritoryLevel, TerritoryLevel | null> = {
  region: null,
  city: 'region',
  barangay: 'city',
};

export default function AdminTerritories() {
  const { showToast } = useToast();
  const [territories, setTerritories] = useState<TerritoryWithOccupancy[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [level, setLevel] = useState<TerritoryLevel>('region');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [capacity, setCapacity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    listTerritories()
      .then(setTerritories)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load territories.'));
  }

  useEffect(load, []);

  const parentLevel = PARENT_LEVEL[level];
  const parentOptions = territories?.filter((t) => t.level === parentLevel) ?? [];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (parentLevel && !parentId) {
      showToast(`Select a ${TERRITORY_LEVEL_LABELS[parentLevel]} first.`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      await createTerritory({
        level,
        name: name.trim(),
        parent_id: parentLevel ? parentId : null,
        capacity: capacity.trim() === '' ? null : Number(capacity),
      });
      showToast(`${name.trim()} added.`);
      setName('');
      setCapacity('');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create territory.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCapacityChange(t: TerritoryWithOccupancy, value: string) {
    const capacityValue = value.trim() === '' ? null : Number(value);
    try {
      await updateTerritoryCapacity(t.id, capacityValue);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update capacity.', 'error');
    }
  }

  async function handleDelete(t: TerritoryWithOccupancy) {
    try {
      await deleteTerritory(t.id);
      showToast(`${t.name} deleted.`);
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
        §7/§9). Capacity limits how many active partners may occupy a territory - leave blank for
        unlimited.
      </p>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}

      <form
        onSubmit={handleCreate}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-sm border border-white/10 bg-lf-charcoal p-5"
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
            Level
          </label>
          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as TerritoryLevel);
              setParentId('');
            }}
            className="rounded-sm border border-white/15 bg-lf-black px-3 py-2.5 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {TERRITORY_LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
        </div>

        {parentLevel && (
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
              Parent {TERRITORY_LEVEL_LABELS[parentLevel]}
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="rounded-sm border border-white/15 bg-lf-black px-3 py-2.5 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
            >
              <option value="">Select…</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-sm border border-white/15 bg-lf-black px-3 py-2.5 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
            Capacity
          </label>
          <input
            type="number"
            min={1}
            placeholder="Unlimited"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-28 rounded-sm border border-white/15 bg-lf-black px-3 py-2.5 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none"
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-gold !px-5 !py-2.5 !text-sm disabled:opacity-50">
          Add Territory
        </button>
      </form>

      {!territories && !error && <p className="mt-6 text-sm text-lf-cream/60">Loading…</p>}

      {territories && (
        <div className="mt-8 space-y-8">
          {LEVELS.map((l) => {
            const rows = territories.filter((t) => t.level === l);
            const parentName = (t: TerritoryWithOccupancy) =>
              territories.find((p) => p.id === t.parent_id)?.name ?? '—';

            return (
              <section key={l}>
                <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
                  {TERRITORY_LEVEL_PLURAL_LABELS[l]}
                </h2>
                {rows.length === 0 ? (
                  <p className="mt-2 text-sm text-lf-cream/50">None yet.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-sm border border-white/10 bg-lf-charcoal">
                    <table className="tabular w-full min-w-[560px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-xs uppercase tracking-wide2 text-lf-cream/50">
                          <th className="px-4 py-3">Name</th>
                          {l !== 'region' && <th className="px-4 py-3">Parent</th>}
                          <th className="px-4 py-3">Occupied</th>
                          <th className="px-4 py-3">Capacity</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((t) => {
                          const full = t.capacity != null && t.occupiedCount >= t.capacity;
                          return (
                            <tr key={t.id} className="border-b border-white/5 last:border-0">
                              <td className="px-4 py-3 text-lf-white">{t.name}</td>
                              {l !== 'region' && (
                                <td className="px-4 py-3 text-lf-cream/60">{parentName(t)}</td>
                              )}
                              <td className="px-4 py-3 text-lf-cream/80">{t.occupiedCount}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min={1}
                                  defaultValue={t.capacity ?? ''}
                                  placeholder="Unlimited"
                                  onBlur={(e) => {
                                    if (e.target.value !== String(t.capacity ?? '')) {
                                      handleCapacityChange(t, e.target.value);
                                    }
                                  }}
                                  className="w-24 rounded-sm border border-white/15 bg-lf-black px-2 py-1.5 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none"
                                />
                              </td>
                              <td className="px-4 py-3">
                                {full ? (
                                  <span className="text-lf-error">Full</span>
                                ) : t.occupiedCount > 0 ? (
                                  <span className="text-lf-gold">Occupied</span>
                                ) : (
                                  <span className="text-lf-success">Available</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(t)}
                                  className="text-xs text-lf-cream/50 hover:text-lf-error"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
