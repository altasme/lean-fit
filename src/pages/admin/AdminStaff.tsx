import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../components/auth/AuthProvider';
import {
  createStaffAccount,
  listStaffAccounts,
  revokeStaffAccount,
  updateStaffAccount,
} from '../../lib/adminStaff';
import type { StaffAccount, StaffPermissions } from '../../lib/adminStaff';
import type { AdminRole } from '../../types/partner';

const inputClass =
  'w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white placeholder:text-lf-cream/30 focus:border-lf-gold focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70';

// The only three areas ever gated behind role='admin' (migration 0014) -
// see migration 0019's has_permission(). Everything else (Orders,
// Partners, Top Sellers, Audit Log) stays open to every staff account
// regardless, and User Management is deliberately not on this list at
// all (granting it would let a staff account widen its own access).
const PERMISSION_FIELDS: { key: keyof StaffPermissions; label: string }[] = [
  { key: 'products', label: 'Products' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'partner_pricing', label: 'Partner Pricing' },
];

function PermissionCheckboxes({
  value,
  onChange,
}: {
  value: StaffPermissions;
  onChange: (next: StaffPermissions) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {PERMISSION_FIELDS.map((f) => (
        <label key={f.key} className="flex items-center gap-2 text-sm text-lf-cream/80">
          <input
            type="checkbox"
            checked={Boolean(value[f.key])}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.checked })}
            className="h-4 w-4 rounded-sm border-white/20 bg-lf-black accent-lf-gold"
          />
          {f.label}
        </label>
      ))}
    </div>
  );
}

// Item #5 - full admins add Staff accounts here, and can edit any
// existing account's name/email/password/role/permissions. Staff log in
// through the same /admin/login as everyone else; role and permissions
// (checked server-side via migration 0014's is_full_admin() and
// migration 0019's has_permission()) are what actually restrict them -
// this page is just where those get set.
export default function AdminStaff() {
  const { showToast } = useToast();
  const { session } = useAuth();
  const [accounts, setAccounts] = useState<StaffAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<StaffPermissions>({});
  const [sendEmail, setSendEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

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
      const { error: createError } = await createStaffAccount(
        { fullName: fullName.trim(), email: email.trim(), password, permissions },
        sendEmail,
      );
      if (createError) {
        setSubmitError(createError);
        return;
      }
      showToast(sendEmail ? 'Staff account created - credentials emailed.' : 'Staff account created.');
      setFullName('');
      setEmail('');
      setPassword('');
      setPermissions({});
      setSendEmail(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(account: StaffAccount) {
    if (!window.confirm(`Remove ${account.full_name ?? account.email}'s admin portal access?`)) return;
    const { error: revokeError } = await revokeStaffAccount(account.user_id);
    if (revokeError) {
      showToast(revokeError, 'error');
      return;
    }
    showToast('Access removed.');
    load();
  }

  return (
    <AdminLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">User Management</h1>
      <p className="mt-2 max-w-2xl text-sm text-lf-cream/60">
        Staff accounts can always view and act on Orders, Partners, Top Sellers, and the Audit Log.
        Products, Promotions, and Partner Pricing are off by default - grant them per account below.
        They log in the same way at <span className="text-lf-cream/80">/admin/login</span> with the
        email and password you set here - just tell them in person, or check the box below to also
        email it.
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

        <div>
          <label className={labelClass}>Permissions</label>
          <PermissionCheckboxes value={permissions} onChange={setPermissions} />
        </div>

        <label className="flex items-center gap-2 text-sm text-lf-cream/80">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="h-4 w-4 rounded-sm border-white/20 bg-lf-black accent-lf-gold"
          />
          Also email these credentials to them now
        </label>

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
        <div className="mt-3 space-y-3">
          {accounts.map((a) => (
            <div key={a.user_id} className="rounded-sm border border-white/10 bg-lf-charcoal">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm text-lf-white">
                    {a.full_name ?? '—'}
                    {a.user_id === session?.user.id && (
                      <span className="ml-2 text-xs uppercase tracking-wide2 text-lf-cream/40">You</span>
                    )}
                  </p>
                  <p className="text-xs text-lf-cream/60">{a.email ?? '—'}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className={a.role === 'admin' ? 'text-lf-gold' : 'text-lf-cream/70'}>
                    {a.role === 'admin' ? 'Admin' : 'Staff'}
                  </span>
                  <span className="tabular text-xs text-lf-cream/50">
                    {new Date(a.created_at).toLocaleDateString('en-PH')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === a.user_id ? null : a.user_id)}
                    className="btn-outline !px-3 !py-1.5 !text-xs"
                  >
                    {editingId === a.user_id ? 'Close' : 'Edit'}
                  </button>
                </div>
              </div>

              {editingId === a.user_id && (
                <EditStaffPanel
                  account={a}
                  isSelf={a.user_id === session?.user.id}
                  onSaved={() => {
                    setEditingId(null);
                    load();
                  }}
                  onRevoke={() => handleRevoke(a)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function EditStaffPanel({
  account,
  isSelf,
  onSaved,
  onRevoke,
}: {
  account: StaffAccount;
  isSelf: boolean;
  onSaved: () => void;
  onRevoke: () => void;
}) {
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(account.full_name ?? '');
  const [email, setEmail] = useState(account.email ?? '');
  const [role, setRole] = useState<AdminRole>(account.role);
  const [permissions, setPermissions] = useState<StaffPermissions>(account.permissions);
  const [newPassword, setNewPassword] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (!fullName.trim() || !email.trim()) return;
    if (newPassword && newPassword.length < 8) {
      setSaveError('New password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await updateStaffAccount(
        {
          staffUserId: account.user_id,
          fullName: fullName.trim(),
          email: email.trim(),
          role,
          permissions,
          password: newPassword || undefined,
        },
        sendEmail,
      );
      if (error) {
        setSaveError(error);
        return;
      }
      showToast('Account updated.');
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 border-t border-white/10 px-4 py-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Full Name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as AdminRole)}
          disabled={isSelf}
          className={`${inputClass} disabled:opacity-50`}
        >
          <option value="staff_admin">Staff</option>
          <option value="admin">Admin</option>
        </select>
        {isSelf && (
          <p className="mt-1.5 text-xs text-lf-cream/40">
            You can't change your own role - have another Admin do it if needed.
          </p>
        )}
      </div>

      {role === 'staff_admin' && (
        <div>
          <label className={labelClass}>Permissions</label>
          <PermissionCheckboxes value={permissions} onChange={setPermissions} />
        </div>
      )}

      <div>
        <label className={labelClass}>Reset Password</label>
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Leave blank to keep current password"
          className={inputClass}
        />
      </div>

      {newPassword && (
        <label className="flex items-center gap-2 text-sm text-lf-cream/80">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="h-4 w-4 rounded-sm border-white/20 bg-lf-black accent-lf-gold"
          />
          Email the new password to them now
        </label>
      )}

      {saveError && (
        <p className="rounded-sm border border-lf-error/40 bg-lf-error/10 px-4 py-3 text-sm text-lf-error">
          {saveError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !fullName.trim() || !email.trim()}
          className="btn-gold !px-5 !py-2.5 !text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {!isSelf && (
          <button
            type="button"
            onClick={onRevoke}
            className="text-xs uppercase tracking-wide2 text-lf-error hover:underline"
          >
            Revoke Access
          </button>
        )}
      </div>
    </div>
  );
}
