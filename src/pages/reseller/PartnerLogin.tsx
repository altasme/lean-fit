import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/auth/AuthProvider';
import { Logo } from '../../components/layout/Logo';
import { RESELLER } from '../../content/site';

export default function PartnerLogin() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (session) {
    return <Navigate to="/reseller/dashboard" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetSent(false);
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate('/reseller/dashboard', { replace: true });
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email above first, then click "Forgot password."');
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reseller/set-password`,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-lf-black px-5">
      <div className="w-full max-w-sm rounded-sm border border-white/10 bg-lf-charcoal p-8">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center font-kicker text-lg uppercase tracking-wide2 text-lf-white">
          Partner Sign In
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide2 text-lf-cream/70">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-white/15 bg-lf-black px-4 py-3 text-sm text-lf-white focus:border-lf-gold focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-lf-error">{error}</p>}
          {resetSent && (
            <p className="text-xs text-lf-success">
              Password reset email sent - check your inbox.
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-50">
            {submitting ? 'Signing In…' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={submitting}
            className="w-full text-center text-xs text-lf-cream/60 hover:text-lf-gold disabled:opacity-50"
          >
            Forgot password?
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-lf-cream/50">
          Not a partner yet?{' '}
          <a href="/reseller" className="text-lf-gold hover:underline">
            Apply here
          </a>{' '}
          or email{' '}
          <a href={`mailto:${RESELLER.contactEmail}`} className="text-lf-gold hover:underline">
            {RESELLER.contactEmail}
          </a>
        </p>
      </div>
    </div>
  );
}
