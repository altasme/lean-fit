import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { fetchMyPartner } from '../../lib/partners';
import type { Partner } from '../../types/partner';

type PartnerAuthContextValue = {
  partner: Partner | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const PartnerAuthContext = createContext<PartnerAuthContextValue>({
  partner: null,
  loading: true,
  refresh: async () => {},
});

/**
 * Resolves the signed-in session (if any) to its `partners` row. A session
 * with no matching row (not a partner, or an invite that hasn't linked
 * user_id yet) resolves to `partner: null` rather than throwing -
 * RequirePartnerAuth treats that the same as "not signed in."
 */
export function PartnerAuthProvider({ children }: PropsWithChildren) {
  const { session, loading: sessionLoading } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      setPartner(null);
      setPartnerLoading(false);
      return;
    }
    setPartnerLoading(true);
    try {
      setPartner(await fetchMyPartner());
    } finally {
      setPartnerLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (sessionLoading) return;
    void refresh();
  }, [sessionLoading, refresh]);

  return (
    <PartnerAuthContext.Provider
      value={{ partner, loading: sessionLoading || partnerLoading, refresh }}
    >
      {children}
    </PartnerAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePartnerAuth() {
  return useContext(PartnerAuthContext);
}
