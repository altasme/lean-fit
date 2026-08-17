import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/auth/AuthProvider';
import { Logo } from '../../components/layout/Logo';

// Landing page for both the invite link (`invite-partner` Edge Function)
// and the "forgot password" reset link - both are Supabase magic links
// that redirect here with an access/refresh token in the URL hash.
// supabase-js auto-detects that hash on load (detectSessionInUrl, on by
// default) and establishes the session before this component needs it -
// we just have to wait for it rather than assume it's already present.
const HAS_AUTH_HASH =
  typeof window !== 'undefined' &&
  /access_token=|type=recovery|type=invite/.test(window.location.hash);

export default function PartnerSetPassword() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigate('/reseller/dashboard', { replace: true });
  }

  const content = (() => {
    if (session) {
      return (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
              Confirm Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-lf-error">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-50">
            {submitting ? 'Saving…' : 'Set Password & Continue'}
          </button>
        </form>
      );
    }

    if (loading || HAS_AUTH_HASH) {
      return <p className="mt-6 text-center text-sm text-lf-cream/60">Verifying your link…</p>;
    }

    return (
      <div className="mt-6 text-center">
        <p className="text-sm text-lf-cream/70">
          This link is invalid or has expired. Ask us to resend your portal invite, or use "Forgot
          password" on the sign-in page.
        </p>
        <a href="/reseller/login" className="btn-outline mt-5 inline-flex !px-5 !py-2.5 !text-sm">
          Back To Sign In
        </a>
      </div>
    );
  })();

  return (
    <div className="flex min-h-screen items-center justify-center bg-lf-black px-5">
      <div className="w-full max-w-sm rounded-sm border border-white/10 bg-lf-charcoal p-8">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center font-kicker text-lg uppercase tracking-wide2 text-lf-white">
          Set Your Password
        </h1>
        {content}
      </div>
    </div>
  );
}
