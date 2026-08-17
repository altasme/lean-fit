import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { listProducts } from '../../lib/adminProducts';
import type { Product } from '../../types/product';
import { PRODUCT_STATUS_LABELS } from '../../types/product';
import { formatPHP } from '../../lib/format';

const STATUS_BADGE: Record<Product['status'], string> = {
  draft: 'border-white/20 text-lf-cream/60',
  active: 'border-lf-success/40 text-lf-success',
  inactive: 'border-lf-error/40 text-lf-error',
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Products</h1>
        <Link to="/admin/products/new" className="btn-gold !px-4 !py-2 !text-sm">
          + New Product
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}
      {!products && !error && <p className="mt-4 text-sm text-lf-cream/60">Loading products…</p>}
      {products && products.length === 0 && (
        <p className="mt-4 text-sm text-lf-cream/60">No products yet.</p>
      )}

      {products && products.length > 0 && (
        <div className="tabular mt-6 overflow-x-auto rounded-sm border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-lf-charcoal text-xs uppercase tracking-wide2 text-lf-cream/60">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SRP</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Promo Exempt</th>
                <th className="px-4 py-3">Slug</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/products/${product.id}`}
                      className="text-lf-gold hover:underline"
                    >
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-lf-white">{formatPHP(product.srp)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-wide2 ${STATUS_BADGE[product.status]}`}
                    >
                      {PRODUCT_STATUS_LABELS[product.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-lf-cream/70">{product.promo_exempt ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-lf-cream/50">{product.slug}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
