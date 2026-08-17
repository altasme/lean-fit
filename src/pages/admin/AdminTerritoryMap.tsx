import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { TerritoryTreeNode } from '../../components/admin/TerritoryTreeNode';
import {
  fetchTerritoryTree,
  findVacantTerritories,
  summarizeCoverage,
} from '../../lib/adminTerritoryMap';
import type { TerritoryNode } from '../../lib/adminTerritoryMap';
import { TERRITORY_LEVEL_LABELS } from '../../types/territory';
import type { TerritoryLevel } from '../../types/territory';

const LEVELS: TerritoryLevel[] = ['region', 'city', 'barangay'];

// Spec Part 1 §12-14/§59: a "Philippines Territory Map" as a strategic
// planning tool - coverage, vacancy, capacity, density, expansion
// candidates. Built as a coverage tree/list rather than a literal
// geographic map - no barangay-level boundary (GeoJSON) data exists to
// render one accurately, and a schematic map would misrepresent real
// coverage. See supabase/README.md's Phase H note.
export default function AdminTerritoryMap() {
  const [roots, setRoots] = useState<TerritoryNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTerritoryTree()
      .then(setRoots)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load territory map.'));
  }, []);

  const stats = roots ? summarizeCoverage(roots) : null;
  const vacant = roots ? findVacantTerritories(roots) : [];

  return (
    <AdminLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Territory Map</h1>
      <p className="mt-2 max-w-2xl text-sm text-lf-cream/60">
        Coverage and expansion overview across the full Region → City → Barangay hierarchy. For
        adding territories or editing capacity, see{' '}
        <Link to="/admin/territories" className="text-lf-gold hover:underline">
          Territories
        </Link>
        .
      </p>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}
      {!roots && !error && <p className="mt-4 text-sm text-lf-cream/60">Loading…</p>}

      {stats && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {LEVELS.map((level) => {
            const bucket = stats[level];
            return (
              <div key={level} className="rounded-sm border border-white/10 bg-lf-charcoal p-5">
                <p className="text-xs uppercase tracking-wide2 text-lf-cream/50">
                  {TERRITORY_LEVEL_LABELS[level]} Coverage
                </p>
                <p className="tabular mt-2 text-2xl font-semibold text-lf-white">
                  {bucket.occupied} / {bucket.total}
                </p>
                <p className="mt-1 text-xs text-lf-cream/50">
                  {bucket.vacant} vacant {bucket.vacant === 1 ? 'territory' : 'territories'}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {roots && roots.length > 0 && (
        <section className="mt-8 rounded-sm border border-white/10 bg-lf-charcoal p-5">
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
            Coverage Tree
          </h2>
          <div className="mt-3">
            {roots.map((node) => (
              <TerritoryTreeNode key={node.id} node={node} />
            ))}
          </div>
        </section>
      )}

      {roots && roots.length === 0 && (
        <p className="mt-8 text-sm text-lf-cream/60">
          No territories yet - add some on the{' '}
          <Link to="/admin/territories" className="text-lf-gold hover:underline">
            Territories
          </Link>{' '}
          page.
        </p>
      )}

      {roots && vacant.length > 0 && (
        <section className="mt-8 rounded-sm border border-white/10 bg-lf-charcoal p-5">
          <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
            Potential Expansion Areas
          </h2>
          <p className="mt-1 text-xs text-lf-cream/50">
            Territories with no active partner - candidates for recruitment.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {vacant.map((t) => (
              <li
                key={t.id}
                className="rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm text-lf-cream/80"
              >
                <span className="text-lf-white">{t.name}</span>
                <span className="block text-xs text-lf-cream/40">
                  {TERRITORY_LEVEL_LABELS[t.level]}
                  {t.parentName ? ` · ${t.parentName}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AdminLayout>
  );
}
