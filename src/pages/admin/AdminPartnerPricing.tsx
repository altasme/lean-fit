import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { listPartnerPricingTiers, updatePartnerDiscount } from '../../lib/adminPartnerPricing';
import { listProducts } from '../../lib/adminProducts';
import { calculatePartnerPrice } from '../../lib/pricing';
import { formatPHP } from '../../lib/format';
import { PARTNER_TYPE_LABELS } from '../../types/partner';
import type { PartnerPricingTier, PartnerType } from '../../types/partner';
import type { Product } from '../../types/product';
import { useToast } from '../../components/ui/Toast';

const PARTNER_TYPES: PartnerType[] = ['reseller', 'distributor', 'franchise'];

export default function AdminPartnerPricing() {
  const { showToast } = useToast();
  const [tiers, setTiers] = useState<PartnerPricingTier[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<PartnerType, number>>({
    reseller: 0,
    distributor: 0,
    franchise: 0,
  });
  const [savingType, setSavingType] = useState<PartnerType | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    Promise.all([listPartnerPricingTiers(), listProducts()])
      .then(([t, p]) => {
        setTiers(t);
        setProducts(p.filter((prod) => prod.status === 'active'));
        setDrafts(
          t.reduce(
            (acc, tier) => ({ ...acc, [tier.partner_type]: tier.discount_pct }),
            {} as Record<PartnerType, number>,
          ),
        );
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleSave(partnerType: PartnerType) {
    setSavingType(partnerType);
    setError(null);
    try {
      await updatePartnerDiscount(partnerType, drafts[partnerType]);
      showToast(`${PARTNER_TYPE_LABELS[partnerType]} pricing updated`);
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSavingType(null);
    }
  }

  return (
    <AdminLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">
        Partner Pricing
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-lf-cream/60">
        Discount percentage off SRP for each partner tier. Partner price recalculates
        automatically whenever a product's SRP changes - these are discounts, not commissions.
      </p>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}
      {!tiers && !error && <p className="mt-4 text-sm text-lf-cream/60">Loading…</p>}

      {tiers && (
        <div className="mt-6 space-y-4">
          {PARTNER_TYPES.map((type) => (
            <div
              key={type}
              className="flex flex-wrap items-center gap-4 rounded-sm border border-white/10 bg-lf-charcoal p-5"
            >
              <div className="w-32 font-kicker uppercase tracking-wide2 text-lf-white">
                {PARTNER_TYPE_LABELS[type]}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={99}
                  step="0.01"
                  value={drafts[type]}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [type]: Number(e.target.value) }))
                  }
                  className="w-24 rounded-sm border border-white/15 bg-lf-black px-3 py-2 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
                />
                <span className="text-sm text-lf-cream/60">% off SRP</span>
              </div>

              <button
                type="button"
                onClick={() => handleSave(type)}
                disabled={savingType === type}
                className="btn-outline !px-4 !py-2 !text-sm disabled:opacity-50"
              >
                {savingType === type ? 'Saving…' : 'Save'}
              </button>

              <div className="tabular ml-auto text-sm text-lf-cream/70">
                {products.length === 0 ? (
                  <span className="text-lf-cream/40">No active products to preview</span>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="flex justify-end gap-2">
                      <span className="text-lf-cream/50">{product.name}:</span>
                      <span className="text-lf-gold">
                        {formatPHP(
                          calculatePartnerPrice(product, type, [
                            { partner_type: type, discount_pct: drafts[type], updated_at: '', updated_by: null },
                          ]).price,
                        )}
                      </span>
                      <span className="text-lf-cream/40">(SRP {formatPHP(product.srp)})</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
