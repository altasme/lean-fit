import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { createProduct, getProduct, productImages, updateProduct } from '../../lib/adminProducts';
import type { ProductInput } from '../../lib/adminProducts';
import { slugify } from '../../lib/slug';
import type { ProductStatus } from '../../types/product';
import { PRODUCT_STATUS_LABELS } from '../../types/product';
import { useToast } from '../../components/ui/Toast';

const EMPTY: ProductInput = {
  slug: '',
  name: '',
  description: '',
  srp: 0,
  status: 'draft',
  promo_exempt: false,
  images: [],
};

const inputClass =
  'w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70';

export default function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState<ProductInput>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    getProduct(id)
      .then((product) => {
        setForm({
          slug: product.slug,
          name: product.name,
          description: product.description ?? '',
          srp: product.srp,
          status: product.status,
          promo_exempt: product.promo_exempt,
          images: productImages(product),
        });
        setSlugTouched(true);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, isNew]);

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  }

  function updateImage(index: number, value: string) {
    setForm((f) => ({ ...f, images: f.images.map((img, i) => (i === index ? value : img)) }));
  }

  function removeImage(index: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = isNew ? await createProduct(form) : await updateProduct(id, form);
      showToast(isNew ? 'Product created' : 'Product saved');
      navigate(`/admin/products/${saved.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save product.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <p className="text-sm text-lf-cream/60">Loading product…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Link to="/admin/products" className="text-sm text-lf-gold hover:underline">
        ← Back to products
      </Link>

      <h1 className="mt-4 font-kicker text-2xl uppercase tracking-wide2 text-lf-white">
        {isNew ? 'New Product' : 'Edit Product'}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-5">
        <div>
          <label className={labelClass}>Product Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Slug</label>
          <input
            required
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm((f) => ({ ...f, slug: e.target.value }));
            }}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={4}
            className={inputClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>SRP (₱)</label>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={form.srp}
              onChange={(e) => setForm((f) => ({ ...f, srp: Number(e.target.value) }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProductStatus }))}
              className={inputClass}
            >
              {(Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PRODUCT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-lf-cream/80">
          <input
            type="checkbox"
            checked={form.promo_exempt}
            onChange={(e) => setForm((f) => ({ ...f, promo_exempt: e.target.checked }))}
            className="h-4 w-4 rounded-sm border-white/20 bg-lf-black accent-lf-gold"
          />
          Exempt from Promo
        </label>

        <div>
          <label className={labelClass}>Product Images (URLs)</label>
          <p className="mb-2 text-xs text-lf-cream/50">
            Full upload/versioning is coming in the media management phase - paste hosted image
            URLs here for now.
          </p>
          <div className="space-y-2">
            {form.images.map((img, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={img}
                  onChange={(e) => updateImage(i, e.target.value)}
                  placeholder="https://…"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="shrink-0 rounded-sm border border-white/15 px-3 text-sm text-lf-cream/60 hover:text-lf-error"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, images: [...f.images, ''] }))}
            className="mt-2 text-sm text-lf-gold hover:underline"
          >
            + Add image URL
          </button>
        </div>

        {error && <p className="text-sm text-lf-error">{error}</p>}

        <button type="submit" disabled={saving} className="btn-gold !px-6 !py-3 disabled:opacity-50">
          {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
        </button>
      </form>
    </AdminLayout>
  );
}
