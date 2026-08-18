import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { TerritoryTreeNode } from '../../components/admin/TerritoryTreeNode';
import { fetchTerritoryTree, flattenSkipProvince, countPartnerTypesTotal } from '../../lib/adminTerritoryMap';
import type { TerritoryNode } from '../../lib/adminTerritoryMap';

const STAT_CARDS = [
  { key: 'franchise' as const, label: 'Franchises' },
  { key: 'distributor' as const, label: 'Distributors' },
  { key: 'reseller' as const, label: 'Resellers' },
];

// Spec Part 1 §12-14/§59: a coverage report, not a CRUD tool - adding
// territories or setting capacity lives on the Territories page. This
// page only ever answers "how many partners, where" - Region -> City ->
// Barangay, nothing auto-expanded (client wants click-to-open only).
export default function AdminTerritoryMap() {
  const [regions, setRegions] = useState<TerritoryNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTerritoryTree()
      .then((roots) => setRegions(flattenSkipProvince(roots)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load territory map.'));
  }, []);

  const totals = regions ? countPartnerTypesTotal(regions) : null;

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Territory Map</h1>
          <p className="mt-2 max-w-2xl text-sm text-lf-cream/60">
            How many Franchise, Distributor, and Reseller partners are active in each area. For
            adding territories or editing capacity, see{' '}
            <Link to="/admin/territories" className="text-lf-gold hover:underline">
              Territories
            </Link>
            .
          </p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}
      {!regions && !error && <p className="mt-6 text-sm text-lf-cream/60">Loading…</p>}

      {totals && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {STAT_CARDS.map((card) => (
            <div key={card.key} className="rounded-sm border border-white/10 bg-lf-charcoal p-5">
              <p className="font-kicker text-xs uppercase tracking-wide2 text-lf-cream/60">{card.label}</p>
              <p className="tabular mt-1.5 font-display text-3xl text-lf-gold">{totals[card.key]}</p>
            </div>
          ))}
        </div>
      )}

      {regions && (
        <section className="mt-8 rounded-sm border border-white/10 bg-lf-charcoal">
          <h2 className="border-b border-white/10 px-5 py-4 font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
            Coverage By Region
          </h2>
          <div className="px-2 pb-2">
            {regions.map((region) => (
              <TerritoryTreeNode key={region.id} node={region} />
            ))}
          </div>
        </section>
      )}
    </AdminLayout>
  );
}
