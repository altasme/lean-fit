import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { captureReferralFromPath } from '../lib/referral';

/**
 * The /:slug catch-all (App.tsx, public host only) - a partner's referral
 * link now looks like leanandfit.ph/juandelacruz rather than
 * leanandfit.ph/?ref=CODE (see lib/partners.ts buildReferralUrl). React
 * Router ranks every other declared route above a dynamic /:slug
 * regardless of declaration order, so this only ever matches a path that
 * isn't /checkout, /admin, /reseller, etc. - it's safe to sit alongside
 * them without a reserved-word list on the frontend (the backend's
 * generate_referral_code, migration 0018, still avoids generating a code
 * that collides with a real route in the first place).
 */
export default function ReferralRedirect() {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    if (slug) captureReferralFromPath(slug);
  }, [slug]);

  return <Navigate to="/" replace />;
}
