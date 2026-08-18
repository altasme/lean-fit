import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { createProduct, getProduct, productImages, updateProduct } from '../../lib/adminProducts';
import type { ProductInput } from '../../lib/adminProducts';
import { slugify } from '../../lib/slug';
import { uploadImageToCloudinary } from '../../lib/cloudinary';
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
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);

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
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, isNew]);

  // Item #3 - the slug field is hidden entirely, always derived from the
  // name. No separate "touched" state to preserve anymore (there's
  // nothing left for the admin to type into) - renaming a product now
  // always renames its slug too.
  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: slugify(name) }));
  }

  async function handleImageUpload(index: number, file: File) {
    setUploadingSlot(index);
    try {
      const result = await uploadImageToCloudinary(file, 'products');
      setForm((f) => ({ ...f, images: f.images.map((img, i) => (i === index ? result.secure_url : img)) }));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Image upload failed.', 'error');
    } finally {
      setUploadingSlot(null);
    }
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
          {form.slug && <p className="mt-1.5 text-xs text-lf-cream/40">URL slug: {form.slug}</p>}
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
          <label className={labelClass}>Product Images</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {form.images.map((img, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-sm border border-white/15 bg-lf-black">
                {uploadingSlot === i ? (
                  <div className="flex h-full items-center justify-center text-xs text-lf-cream/50">Uploading…</div>
                ) : img ? (
                  <img src={img} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-lf-cream/40">No image</div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImageUpload(i, file);
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label={`Upload image ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute right-1 top-1 rounded-full bg-lf-black/80 px-2 py-0.5 text-xs text-lf-cream/70 hover:text-lf-error"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, images: [...f.images, ''] }))}
              className="flex aspect-square items-center justify-center rounded-sm border border-dashed border-white/20 text-sm text-lf-cream/50 hover:border-lf-gold/50 hover:text-lf-gold"
            >
              + Add Slot
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-lf-error">{error}</p>}

        <button type="submit" disabled={saving} className="btn-gold !px-6 !py-3 disabled:opacity-50">
          {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
        </button>
      </form>
    </AdminLayout>
  );
}
