import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  createPromotion,
  getPromotion,
  updatePromotion,
} from '../../lib/adminPromotions';
import type { PromotionInput } from '../../lib/adminPromotions';
import { listProducts } from '../../lib/adminProducts';
import type { Product } from '../../types/product';
import type { DiscountType, PromotionStatus } from '../../types/promotion';
import { useToast } from '../../components/ui/Toast';

const EMPTY: PromotionInput = {
  name: '',
  code: '',
  discount_type: 'percentage',
  discount_value: 0,
  starts_at: null,
  ends_at: null,
  usage_limit: null,
  status: 'inactive',
  applicable_product_ids: [],
  auto_apply: false,
};

const inputClass =
  'w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70';

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

function fromDateInput(value: string): string | null {
  return value ? new Date(`${value}T00:00:00Z`).toISOString() : null;
}

export default function AdminPromotionForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState<PromotionInput>(EMPTY);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProducts().then(setProducts).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isNew) return;
    getPromotion(id)
      .then((promo) => {
        setForm({
          name: promo.name,
          code: promo.code,
          discount_type: promo.discount_type,
          discount_value: promo.discount_value,
          starts_at: promo.starts_at,
          ends_at: promo.ends_at,
          usage_limit: promo.usage_limit,
          status: promo.status,
          applicable_product_ids: promo.applicable_product_ids,
          auto_apply: promo.auto_apply,
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, isNew]);

  function toggleProduct(productId: string) {
    setForm((f) => ({
      ...f,
      applicable_product_ids: f.applicable_product_ids.includes(productId)
        ? f.applicable_product_ids.filter((p) => p !== productId)
        : [...f.applicable_product_ids, productId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = isNew ? await createPromotion(form) : await updatePromotion(id, form);
      showToast(isNew ? 'Promotion created' : 'Promotion saved');
      navigate(`/admin/promotions/${saved.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save promotion.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <p className="text-sm text-lf-cream/60">Loading promotion…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Link to="/admin/promotions" className="text-sm text-lf-gold hover:underline">
        ← Back to promotions
      </Link>

      <h1 className="mt-4 font-kicker text-2xl uppercase tracking-wide2 text-lf-white">
        {isNew ? 'New Promotion' : 'Edit Promotion'}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Promo Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Discount Code</label>
            <input
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Discount Type</label>
            <select
              value={form.discount_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, discount_type: e.target.value as DiscountType }))
              }
              className={inputClass}
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Discount Value {form.discount_type === 'percentage' ? '(%)' : '(₱)'}
            </label>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={form.discount_value}
              onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Start Date (optional)</label>
            <input
              type="date"
              value={toDateInput(form.starts_at)}
              onChange={(e) => setForm((f) => ({ ...f, starts_at: fromDateInput(e.target.value) }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>End Date (optional)</label>
            <input
              type="date"
              value={toDateInput(form.ends_at)}
              onChange={(e) => setForm((f) => ({ ...f, ends_at: fromDateInput(e.target.value) }))}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Usage Limit (optional)</label>
          <input
            type="number"
            min={1}
            value={form.usage_limit ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                usage_limit: e.target.value ? Number(e.target.value) : null,
              }))
            }
            placeholder="Unlimited"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Applicable Products</label>
          <p className="mb-2 text-xs text-lf-cream/50">None selected = applies to every product.</p>
          <div className="space-y-2 rounded-sm border border-white/10 bg-lf-black p-3">
            {products.length === 0 && (
              <p className="text-xs text-lf-cream/50">No products yet.</p>
            )}
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm text-lf-cream/80">
                <input
                  type="checkbox"
                  checked={form.applicable_product_ids.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                  className="h-4 w-4 rounded-sm border-white/20 bg-lf-black accent-lf-gold"
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-lf-cream/80">
            <input
              type="checkbox"
              checked={form.auto_apply}
              onChange={(e) => setForm((f) => ({ ...f, auto_apply: e.target.checked }))}
              className="h-4 w-4 rounded-sm border-white/20 bg-lf-black accent-lf-gold"
            />
            Auto-Apply (no code needed at checkout)
          </label>

          <label className="flex items-center gap-2 text-sm text-lf-cream/80">
            <input
              type="checkbox"
              checked={form.status === 'active'}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: (e.target.checked ? 'active' : 'inactive') as PromotionStatus }))
              }
              className="h-4 w-4 rounded-sm border-white/20 bg-lf-black accent-lf-gold"
            />
            Active
          </label>
        </div>

        {form.auto_apply && (
          <p className="rounded-sm border border-lf-gold/30 bg-lf-gold/5 px-4 py-3 text-xs text-lf-cream/70">
            A customer-entered discount code always overrides this auto-apply promotion - the two
            never stack.
          </p>
        )}

        {error && <p className="text-sm text-lf-error">{error}</p>}

        <button type="submit" disabled={saving} className="btn-gold !px-6 !py-3 disabled:opacity-50">
          {saving ? 'Saving…' : isNew ? 'Create Promotion' : 'Save Changes'}
        </button>
      </form>
    </AdminLayout>
  );
}
