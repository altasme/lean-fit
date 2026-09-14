import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useToast } from '../../components/ui/Toast';
import { createManualPartnerOrder } from '../../lib/adminOrders';
import { listPartners } from '../../lib/adminPartners';
import { listProducts } from '../../lib/adminProducts';
import { listPartnerPricingTiers } from '../../lib/adminPartnerPricing';
import { calculatePartnerPrice } from '../../lib/pricing';
import { formatPHP } from '../../lib/format';
import { PAYMENT_METHODS } from '../../content/payment';
import { ORDER_TYPE_LABELS } from '../../types/order';
import type { OrderType } from '../../types/order';
import type { Partner, PartnerPricingTier } from '../../types/partner';
import type { Product } from '../../types/product';
import type { PaymentMethodId } from '../../types/payment';

const ORDER_TYPES: Extract<OrderType, 'reseller' | 'distributor' | 'franchise'>[] = [
  'reseller',
  'distributor',
  'franchise',
];
const MANUAL_METHODS = PAYMENT_METHODS.filter((m) => m.provider === 'manual');

const inputClass =
  'w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70';

type FormState = {
  orderType: Extract<OrderType, 'reseller' | 'distributor' | 'franchise'> | null;
  partnerId: string;
  productId: string;
  quantity: number | null;
  unitPrice: number | null;
  deliveryFee: number | null;
  customerName: string;
  email: string;
  mobile: string;
  address: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  deliveryNotes: string;
  paymentMethod: PaymentMethodId | null;
  paymentReference: string;
  paymentAmount: number | null;
  paymentDate: string;
  markPaid: boolean;
};

const EMPTY: FormState = {
  orderType: null,
  partnerId: '',
  productId: '',
  quantity: null,
  unitPrice: null,
  deliveryFee: 0,
  customerName: '',
  email: '',
  mobile: '',
  address: '',
  barangay: '',
  city: '',
  province: '',
  postalCode: '',
  deliveryNotes: '',
  paymentMethod: null,
  paymentReference: '',
  paymentAmount: null,
  paymentDate: '',
  markPaid: false,
};

type Errors = Partial<Record<keyof FormState, string>>;

// Admin-side "Add Order" form for a Reseller/Distributor/Franchise partner
// buying MORE stock for themselves at their tier price - a wholesale
// restock, not a retail sale referred through the site (see migration
// 0023). Picking an active partner auto-fills delivery details and tier
// pricing; both stay editable in case the actual arrangement differs.
export default function AdminOrderCreate() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [tiers, setTiers] = useState<PartnerPricingTier[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [priceTouched, setPriceTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listPartners(), listProducts(), listPartnerPricingTiers()])
      .then(([p, pr, t]) => {
        setPartners(p);
        setProducts(pr);
        setTiers(t);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load form data.'));
  }, []);

  const eligiblePartners = useMemo(
    () => (partners ?? []).filter((p) => p.status === 'active' && p.partner_type === form.orderType),
    [partners, form.orderType],
  );

  const activeProducts = useMemo(() => (products ?? []).filter((p) => p.status === 'active'), [products]);

  const selectedProduct = useMemo(
    () => activeProducts.find((p) => p.id === form.productId) ?? null,
    [activeProducts, form.productId],
  );

  // Auto-select the only active product once loaded, if there is exactly one.
  useEffect(() => {
    if (form.productId || activeProducts.length !== 1) return;
    setForm((f) => ({ ...f, productId: activeProducts[0].id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProducts]);

  useEffect(() => {
    if (!form.orderType || !selectedProduct || !tiers || priceTouched) return;
    const result = calculatePartnerPrice(selectedProduct, form.orderType, tiers);
    setForm((f) => ({ ...f, unitPrice: result.price }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.orderType, selectedProduct, tiers]);

  const quantity = form.quantity ?? 0;
  const unitPrice = form.unitPrice ?? 0;
  const deliveryFee = form.deliveryFee ?? 0;
  const subtotal = quantity * unitPrice;
  const total = subtotal + deliveryFee;

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function selectOrderType(type: Extract<OrderType, 'reseller' | 'distributor' | 'franchise'>) {
    setForm((f) => ({ ...EMPTY, orderType: type, productId: f.productId }));
    setPriceTouched(false);
    setErrors({});
  }

  function selectPartner(partnerId: string) {
    const partner = eligiblePartners.find((p) => p.id === partnerId) ?? null;
    setForm((f) => ({
      ...f,
      partnerId,
      customerName: partner?.full_name ?? f.customerName,
      email: partner?.email ?? f.email,
      mobile: partner?.mobile ?? f.mobile,
      address: partner?.address ?? f.address,
      barangay: partner?.barangay ?? f.barangay,
      city: partner?.city ?? f.city,
      province: partner?.region ?? f.province,
      postalCode: f.postalCode,
    }));
    setErrors((prev) => ({ ...prev, partnerId: undefined }));
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!form.orderType) e.orderType = 'Select an order type.';
    if (!form.partnerId) e.partnerId = 'Select a partner.';
    if (!form.productId) e.productId = 'Select a product.';
    if (!form.quantity || form.quantity <= 0) e.quantity = 'Quantity must be at least 1.';
    if (form.unitPrice == null || form.unitPrice < 0) e.unitPrice = 'Unit price is required.';
    if (form.deliveryFee == null || form.deliveryFee < 0) e.deliveryFee = 'Delivery fee is required.';
    if (!form.customerName.trim()) e.customerName = 'Required.';
    if (!form.email.trim()) e.email = 'Required.';
    if (!form.mobile.trim()) e.mobile = 'Required.';
    if (!form.address.trim()) e.address = 'Required.';
    if (!form.barangay.trim()) e.barangay = 'Required.';
    if (!form.city.trim()) e.city = 'Required.';
    if (!form.province.trim()) e.province = 'Required.';
    if (!form.postalCode.trim()) e.postalCode = 'Required.';
    if (!form.paymentMethod) e.paymentMethod = 'Select a payment method.';
    if (!form.paymentReference.trim()) e.paymentReference = 'Required.';
    if (form.paymentAmount == null || form.paymentAmount <= 0) e.paymentAmount = 'Required.';
    if (!form.paymentDate) e.paymentDate = 'Required.';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formErrors = validate();
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0 || !form.orderType || !selectedProduct || !form.paymentMethod) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createManualPartnerOrder({
        orderType: form.orderType,
        partnerId: form.partnerId,
        delivery: {
          customerName: form.customerName,
          email: form.email,
          mobile: form.mobile,
          address: form.address,
          barangay: form.barangay,
          city: form.city,
          province: form.province,
          postalCode: form.postalCode,
          deliveryNotes: form.deliveryNotes || undefined,
        },
        productName: selectedProduct.name,
        quantity,
        unitPrice,
        subtotal,
        deliveryFee,
        total,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference,
        paymentAmount: form.paymentAmount,
        paymentDate: form.paymentDate,
        markPaid: form.markPaid,
      });
      showToast(`Order ${result.orderNo} created.`);
      navigate(`/admin/orders/${result.orderId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <Link to="/admin" className="text-sm text-lf-gold hover:underline">
        ← Back to orders
      </Link>
      <h1 className="mt-4 font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Add Order</h1>
      <p className="mt-1 text-sm text-lf-cream/60">
        For a Reseller/Distributor/Franchise partner restocking their own inventory at their tier
        price - not a referred retail sale.
      </p>

      {loadError && <p className="mt-4 text-sm text-lf-error">{loadError}</p>}

      {partners && products && tiers && (
        <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-6">
          <section className="space-y-5 rounded-sm border border-white/10 bg-lf-charcoal p-6">
            <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Order Type &amp; Partner</h2>

            <div className="grid grid-cols-3 gap-2">
              {ORDER_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => selectOrderType(type)}
                  className={`rounded-sm border px-3 py-2.5 text-sm font-kicker uppercase tracking-wide2 transition-colors ${
                    form.orderType === type
                      ? 'border-lf-gold bg-lf-gold text-lf-black'
                      : 'border-white/15 text-lf-cream/70 hover:border-lf-gold/50'
                  }`}
                >
                  {ORDER_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
            {errors.orderType && <p className="text-xs text-lf-error">{errors.orderType}</p>}

            {form.orderType && (
              <div>
                <label className={labelClass}>Partner</label>
                <select
                  value={form.partnerId}
                  onChange={(e) => selectPartner(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {eligiblePartners.length === 0 ? 'No active partners of this type' : 'Select a partner'}
                  </option>
                  {eligiblePartners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.email})
                    </option>
                  ))}
                </select>
                {errors.partnerId && <p className="mt-1.5 text-xs text-lf-error">{errors.partnerId}</p>}
              </div>
            )}
          </section>

          {form.partnerId && (
            <>
              <section className="space-y-5 rounded-sm border border-white/10 bg-lf-charcoal p-6">
                <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Product</h2>

                <div>
                  <label className={labelClass}>Product</label>
                  <select
                    value={form.productId}
                    onChange={(e) => {
                      update('productId', e.target.value);
                      setPriceTouched(false);
                    }}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select a product
                    </option>
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {errors.productId && <p className="mt-1.5 text-xs text-lf-error">{errors.productId}</p>}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={form.quantity ?? ''}
                      onChange={(e) => update('quantity', e.target.value === '' ? null : Number(e.target.value))}
                      className={`${inputClass} tabular`}
                    />
                    {errors.quantity && <p className="mt-1.5 text-xs text-lf-error">{errors.quantity}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Unit Price (₱)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.unitPrice ?? ''}
                      onChange={(e) => {
                        setPriceTouched(true);
                        update('unitPrice', e.target.value === '' ? null : Number(e.target.value));
                      }}
                      className={`${inputClass} tabular`}
                    />
                    {errors.unitPrice && <p className="mt-1.5 text-xs text-lf-error">{errors.unitPrice}</p>}
                    {form.orderType && (
                      <p className="mt-1 text-xs text-lf-cream/40">
                        Auto-filled from {ORDER_TYPE_LABELS[form.orderType]} tier pricing - edit if the actual
                        price agreed differs.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Delivery Fee (₱)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.deliveryFee ?? ''}
                    onChange={(e) => update('deliveryFee', e.target.value === '' ? null : Number(e.target.value))}
                    className={`${inputClass} tabular max-w-[200px]`}
                  />
                  {errors.deliveryFee && <p className="mt-1.5 text-xs text-lf-error">{errors.deliveryFee}</p>}
                </div>

                <dl className="tabular space-y-1.5 border-t border-white/10 pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-lf-cream/60">Subtotal</dt>
                    <dd className="text-lf-white">{formatPHP(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between font-medium">
                    <dt className="text-lf-cream/80">Total</dt>
                    <dd className="text-lf-gold">{formatPHP(total)}</dd>
                  </div>
                </dl>
              </section>

              <section className="space-y-5 rounded-sm border border-white/10 bg-lf-charcoal p-6">
                <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Delivery Details</h2>

                <div>
                  <label className={labelClass}>Full Name</label>
                  <input
                    value={form.customerName}
                    onChange={(e) => update('customerName', e.target.value)}
                    className={inputClass}
                  />
                  {errors.customerName && <p className="mt-1.5 text-xs text-lf-error">{errors.customerName}</p>}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Mobile Number</label>
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={(e) => update('mobile', e.target.value)}
                      className={inputClass}
                    />
                    {errors.mobile && <p className="mt-1.5 text-xs text-lf-error">{errors.mobile}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      className={inputClass}
                    />
                    {errors.email && <p className="mt-1.5 text-xs text-lf-error">{errors.email}</p>}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Address</label>
                  <input value={form.address} onChange={(e) => update('address', e.target.value)} className={inputClass} />
                  {errors.address && <p className="mt-1.5 text-xs text-lf-error">{errors.address}</p>}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Barangay</label>
                    <input
                      value={form.barangay}
                      onChange={(e) => update('barangay', e.target.value)}
                      className={inputClass}
                    />
                    {errors.barangay && <p className="mt-1.5 text-xs text-lf-error">{errors.barangay}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>City / Municipality</label>
                    <input value={form.city} onChange={(e) => update('city', e.target.value)} className={inputClass} />
                    {errors.city && <p className="mt-1.5 text-xs text-lf-error">{errors.city}</p>}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Province</label>
                    <input
                      value={form.province}
                      onChange={(e) => update('province', e.target.value)}
                      className={inputClass}
                    />
                    {errors.province && <p className="mt-1.5 text-xs text-lf-error">{errors.province}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Postal Code</label>
                    <input
                      value={form.postalCode}
                      onChange={(e) => update('postalCode', e.target.value)}
                      className={inputClass}
                    />
                    {errors.postalCode && <p className="mt-1.5 text-xs text-lf-error">{errors.postalCode}</p>}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Delivery Notes (optional)</label>
                  <input
                    value={form.deliveryNotes}
                    onChange={(e) => update('deliveryNotes', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </section>

              <section className="space-y-5 rounded-sm border border-white/10 bg-lf-charcoal p-6">
                <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Payment</h2>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Payment Method</label>
                    <select
                      value={form.paymentMethod ?? ''}
                      onChange={(e) => update('paymentMethod', (e.target.value || null) as PaymentMethodId)}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select a method
                      </option>
                      {MANUAL_METHODS.map((m) => (
                        <option key={m.code} value={m.code}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    {errors.paymentMethod && <p className="mt-1.5 text-xs text-lf-error">{errors.paymentMethod}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Reference No.</label>
                    <input
                      value={form.paymentReference}
                      onChange={(e) => update('paymentReference', e.target.value)}
                      className={inputClass}
                    />
                    {errors.paymentReference && (
                      <p className="mt-1.5 text-xs text-lf-error">{errors.paymentReference}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Amount Paid (₱)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.paymentAmount ?? ''}
                      onChange={(e) => update('paymentAmount', e.target.value === '' ? null : Number(e.target.value))}
                      className={`${inputClass} tabular`}
                    />
                    {errors.paymentAmount && <p className="mt-1.5 text-xs text-lf-error">{errors.paymentAmount}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Payment Date</label>
                    <input
                      type="date"
                      value={form.paymentDate}
                      onChange={(e) => update('paymentDate', e.target.value)}
                      className={`${inputClass} tabular`}
                    />
                    {errors.paymentDate && <p className="mt-1.5 text-xs text-lf-error">{errors.paymentDate}</p>}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-lf-cream/80">
                  <input
                    type="checkbox"
                    checked={form.markPaid}
                    onChange={(e) => update('markPaid', e.target.checked)}
                    className="h-4 w-4 rounded-sm border-white/20 bg-lf-black accent-lf-gold"
                  />
                  Payment already verified - marks paid and confirms the order immediately
                </label>
                <p className="text-xs text-lf-cream/50">
                  {form.markPaid
                    ? 'Order will be created as Confirmed / Paid.'
                    : 'Order will be created as Pending / Pending Verification, same as a normal manual-payment order.'}
                </p>
              </section>

              {submitError && (
                <p className="rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
                  {submitError}
                </p>
              )}

              <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-50">
                {submitting ? 'Saving…' : 'Create Order'}
              </button>
            </>
          )}
        </form>
      )}
    </AdminLayout>
  );
}
