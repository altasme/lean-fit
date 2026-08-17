import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { listAuditLog } from '../../lib/adminAuditLog';
import type { AuditLogEntry } from '../../types/auditLog';
import { ENTITY_TYPE_LABELS } from '../../types/auditLog';

export default function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    listAuditLog()
      .then(setEntries)
      .catch((err) => setError(err.message));
  }, []);

  const entityTypes = useMemo(() => {
    if (!entries) return [];
    return Array.from(new Set(entries.map((e) => e.entity_type))).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (entityFilter !== 'all' && entry.entity_type !== entityFilter) return false;
      if (term) {
        const haystack =
          `${entry.entity_id ?? ''} ${entry.field ?? ''} ${entry.note ?? ''} ${entry.action}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [entries, entityFilter, search]);

  return (
    <AdminLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Audit Log</h1>
      <p className="mt-2 max-w-2xl text-sm text-lf-cream/60">
        Every product, pricing, promotion, partner-pricing, media, and order/payment status change
        made through this admin panel, most recent first.
      </p>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}
      {!entries && !error && <p className="mt-4 text-sm text-lf-cream/60">Loading…</p>}

      {entries && (
        <>
          <div className="mt-6 flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="block font-kicker text-xs uppercase tracking-wide2 text-lf-cream/60">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Entity ID, field, note…"
                className="mt-1 w-full rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-kicker text-xs uppercase tracking-wide2 text-lf-cream/60">
                Entity Type
              </label>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="mt-1 rounded-sm border border-white/10 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
              >
                <option value="all">All</option>
                {entityTypes.map((type) => (
                  <option key={type} value={type}>
                    {ENTITY_TYPE_LABELS[type] ?? type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-4 text-xs text-lf-cream/50">
            {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}
            {filtered.length !== entries.length ? ` (of ${entries.length} total)` : ''}
          </p>

          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-lf-cream/60">No audit entries match these filters.</p>
          ) : (
            <div className="tabular mt-2 overflow-x-auto rounded-sm border border-white/10">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-lf-charcoal text-xs uppercase tracking-wide2 text-lf-cream/60">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Field</th>
                    <th className="px-4 py-3">Change</th>
                    <th className="px-4 py-3">By</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="whitespace-nowrap px-4 py-3 text-lf-cream/60">
                        {new Date(entry.created_at).toLocaleString('en-PH')}
                      </td>
                      <td className="px-4 py-3 text-lf-white">
                        {ENTITY_TYPE_LABELS[entry.entity_type] ?? entry.entity_type}
                      </td>
                      <td className="px-4 py-3 text-lf-cream/70">{entry.action}</td>
                      <td className="px-4 py-3 text-lf-cream/70">{entry.field ?? '—'}</td>
                      <td className="px-4 py-3 text-lf-cream/70">
                        {entry.previous_value != null || entry.new_value != null ? (
                          <span>
                            {entry.previous_value != null && (
                              <span className="text-lf-cream/40 line-through">
                                {entry.previous_value}
                              </span>
                            )}
                            {entry.previous_value != null && entry.new_value != null && ' → '}
                            {entry.new_value != null && (
                              <span className="text-lf-gold">{entry.new_value}</span>
                            )}
                          </span>
                        ) : (
                          entry.note ?? '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-lf-cream/50">
                        {entry.changed_by ? 'Admin' : 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
