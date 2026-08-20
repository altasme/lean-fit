import { AdminLayout } from '../../components/admin/AdminLayout';
import { TopSellersTable } from '../../components/shared/TopSellersTable';

/** Client spec item #4 - admin's "Top Sellers," same leaderboard as the partner portal's. */
export default function AdminTopSellers() {
  return (
    <AdminLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Top Sellers</h1>
      <div className="mt-6">
        <TopSellersTable />
      </div>
    </AdminLayout>
  );
}
