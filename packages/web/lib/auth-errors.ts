import { useTranslations } from 'next-intl';

/**
 * Single place that turns an auth failure into a user-facing message (Phase 82
 * Theme C). Gateway error messages are out of scope this phase, so when the
 * thrown error carries one it's surfaced as-is; the localized `auth.errors.*`
 * fallback covers the no-message cases (network error, a thrown non-Error).
 * A gateway error **code** → key map slots in at the marked line once the
 * gateway returns structured auth codes — every auth surface already routes
 * through here, so that upgrade is one edit.
 */
export type AuthErrorFallback = 'registrationFailed' | 'generic';

export function useAuthErrorMessage(): (err: unknown, fallback?: AuthErrorFallback) => string {
  const t = useTranslations('auth');
  return (err, fallback = 'generic') => {
    // ← future: map `err.code` to a localized `auth.errors.<code>` key here.
    const raw = err instanceof Error ? err.message : '';
    return raw || t(`errors.${fallback}`);
  };
}
