import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { listPromotions } from '../../lib/adminPromotions';
import type { Promotion } from '../../types/promotion';

function formatDiscount(p: Promotion): string {
  return p.discount_type === 'percentage' ? `${p.discount_value}%` : `₱${p.discount_value}`;
}

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPromotions()
      .then(setPromotions)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Promotions</h1>
        <Link to="/admin/promotions/new" className="btn-gold !px-4 !py-2 !text-sm">
          + New Promotion
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}
      {!promotions && !error && <p className="mt-4 text-sm text-lf-cream/60">Loading promotions…</p>}
      {promotions && promotions.length === 0 && (
        <p className="mt-4 text-sm text-lf-cream/60">No promotions yet.</p>
      )}

      {promotions && promotions.length > 0 && (
        <div className="tabular mt-6 overflow-x-auto rounded-sm border border-white/10">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-lf-charcoal text-xs uppercase tracking-wide2 text-lf-cream/60">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Auto-Apply</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Usage</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promo) => (
                <tr key={promo.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/promotions/${promo.id}`}
                      className="text-lf-gold hover:underline"
                    >
                      {promo.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-lf-white">{promo.code}</td>
                  <td className="px-4 py-3 text-lf-white">{formatDiscount(promo)}</td>
                  <td className="px-4 py-3 text-lf-cream/70">{promo.auto_apply ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-wide2 ${
                        promo.status === 'active'
                          ? 'border-lf-success/40 text-lf-success'
                          : 'border-white/20 text-lf-cream/60'
                      }`}
                    >
                      {promo.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-lf-cream/60">
                    {promo.times_used}
                    {promo.usage_limit ? ` / ${promo.usage_limit}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
