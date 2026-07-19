'use client';

import { useEffect, useState } from 'react';
import { probeOperator } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

export interface OperatorState {
  /** `true` = operator, `false` = signed-in non-operator, `null` = still resolving. */
  isOperator: boolean | null;
  /** True while the probe (or the initial session restore) is in flight. */
  loading: boolean;
}

/**
 * The thin operator gate seam (Phase 73 Theme E), wired to Theme D's server-side
 * `@RequiresOperator`. There is no `isOperator` field on `/auth/me` — access itself
 * is the signal — so this probes the operator-gated `GET /admin/overview`:
 *  - HTTP 200 ⇒ operator (`isOperator = true`);
 *  - HTTP 403 ⇒ signed-in non-operator (`isOperator = false`);
 *  - anything else / network ⇒ unknown (`isOperator = null`, still loading).
 *
 * The probe only runs once a session exists (a signed-out user is handled by the
 * gate before this matters), and re-runs when the token changes (login/logout).
 */
export function useIsOperator(): OperatorState {
  const { user, isLoading: authLoading } = useAuth();
  const [isOperator, setIsOperator] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Not signed in — nothing to probe; the app gate renders login.
      setIsOperator(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void probeOperator(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result === 'operator') setIsOperator(true);
      else if (result === 'forbidden') setIsOperator(false);
      else setIsOperator(null);
      setLoading(false);
    });
    return () => controller.abort();
  }, [user, authLoading]);

  return { isOperator, loading };
}
