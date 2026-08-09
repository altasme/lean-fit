import type { DeliveryDetails } from '../../types/order';
import type { DeliveryFormErrors } from '../../lib/validation';

type Field = {
  name: keyof DeliveryDetails;
  label: string;
  required?: boolean;
  type?: string;
  span?: 'full' | 'half';
};

const FIELDS: Field[] = [
  { name: 'customerName', label: 'Full Name', required: true, span: 'full' },
  { name: 'mobile', label: 'Mobile Number', required: true, type: 'tel', span: 'half' },
  { name: 'email', label: 'Email', required: true, type: 'email', span: 'half' },
  { name: 'address', label: 'Complete Address', required: true, span: 'full' },
  { name: 'barangay', label: 'Barangay', required: true, span: 'half' },
  { name: 'city', label: 'City / Municipality', required: true, span: 'half' },
  { name: 'province', label: 'Province', required: true, span: 'half' },
  { name: 'postalCode', label: 'Postal Code', required: true, span: 'half' },
  { name: 'deliveryNotes', label: 'Delivery Notes (optional)', span: 'full' },
];

export function DeliveryForm({
  values,
  errors,
  onChange,
}: {
  values: DeliveryDetails;
  errors: DeliveryFormErrors;
  onChange: (field: keyof DeliveryDetails, value: string) => void;
}) {
  return (
    <div className="rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8">
      <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
        Delivery Details
      </h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.name} className={field.span === 'full' ? 'sm:col-span-2' : ''}>
            <label
              htmlFor={field.name}
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70"
            >
              {field.label}
            </label>
            <input
              id={field.name}
              type={field.type ?? 'text'}
              value={values[field.name] ?? ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.name === 'mobile' ? '09171234567' : undefined}
              className="w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none"
              aria-invalid={Boolean(errors[field.name])}
            />
            {errors[field.name] && (
              <p className="mt-1.5 text-xs text-lf-error">{errors[field.name]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
