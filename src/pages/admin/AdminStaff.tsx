import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useToast } from '../../components/ui/Toast';
import { createStaffAccount, listStaffAccounts } from '../../lib/adminStaff';
import type { StaffAccount } from '../../lib/adminStaff';

const inputClass =
  'w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70';

// Item #5 - full admins add Staff accounts here. Staff log in through the
// same /admin/login as everyone else; their role (checked server-side via
// migration 0014's is_full_admin()) is what actually restricts them to
// Orders - this page is just where that account gets created.
export default function AdminStaff() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<StaffAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function load() {
    listStaffAccounts()
      .then(setAccounts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load staff accounts.'));
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 8) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error: createError } = await createStaffAccount({ fullName: fullName.trim(), email: email.trim(), password });
      if (createError) {
        setSubmitError(createError);
        return;
      }
      showToast('Staff account created - credentials emailed.');
      setFullName('');
      setEmail('');
      setPassword('');
      load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">User Management</h1>
      <p className="mt-2 max-w-2xl text-sm text-lf-cream/60">
        Staff accounts can view and act on Orders, but can't edit Products, Promotions, or Partner
        Pricing. They log in the same way at{' '}
        <span className="text-lf-cream/80">/admin/login</span> with the email and password you set here.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-xl space-y-5 rounded-sm border border-white/10 bg-lf-charcoal p-6 sm:p-8"
      >
        <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-gold">Add Staff Account</h2>

        <div>
          <label className={labelClass}>Full Name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Type a password (min. 8 characters)"
            className={inputClass}
          />
        </div>

        {submitError && (
          <p className="rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !fullName.trim() || !email.trim() || password.length < 8}
          className="btn-gold w-full disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Staff Account'}
        </button>
      </form>

      <h2 className="mt-10 font-kicker text-sm uppercase tracking-wide2 text-lf-gold">All Accounts</h2>
      {error && <p className="mt-3 text-sm text-lf-error">{error}</p>}
      {!accounts && !error && <p className="mt-3 text-sm text-lf-cream/60">Loading…</p>}

      {accounts && (
        <div className="tabular mt-3 overflow-x-auto rounded-sm border border-white/10">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-lf-charcoal text-xs uppercase tracking-wide2 text-lf-cream/60">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Added</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.user_id} className="border-t border-white/5">
                  <td className="px-4 py-3 text-lf-white">{a.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-lf-cream/70">{a.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={a.role === 'admin' ? 'text-lf-gold' : 'text-lf-cream/70'}>
                      {a.role === 'admin' ? 'Admin' : 'Staff'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-lf-cream/60">{new Date(a.created_at).toLocaleDateString('en-PH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
