'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { HEARTBEAT_PRESETS } from './app-settings';
import { SSO_ERROR_MESSAGES } from './api';

/**
 * Phase 82 D — call-site seams for user-facing copy that lives in plain **`.ts`**
 * modules.
 *
 * The `i18next/no-literal-string` gate runs in `jsx-text-only` mode over `.tsx`
 * files, so a `.ts` module is invisible to it *twice over*: wrong extension, and
 * the copy isn't JSX text anyway. PR #599 found the first instance of this
 * (`use-gateway-error-toast.ts`, firing on a dozen polling pages while the gate
 * reported the whole slice clean). These are the two the import-graph sweep of
 * this slice's files turned up, both on already-"migrated" surfaces:
 *
 * - `SSO_ERROR_MESSAGES` in `lib/api.ts` — ten sign-in failure messages rendered
 *   by the login page, which Theme C otherwise translated in full.
 * - `HEARTBEAT_PRESETS` in `lib/app-settings.ts` — the cadence dropdown in
 *   Settings → Agents, likewise otherwise translated.
 *
 * The modules keep their English (they are plain data, imported by non-React code
 * and by tests), and resolution happens here with that English as the per-key
 * fallback — the same shape as `lib/setup-item-labels.ts` and the four registry
 * seams before it.
 */

/** A localised `sso_error` message, or `null` when there's no error code. */
export function useSsoErrorMessage(): (code: string | null | undefined) => string | null {
  const t = useTranslations('auth');
  return useMemo(() => {
    return (code) => {
      if (!code) return null;
      const key = `ssoErrors.${code}`;
      if (t.has(key)) return t(key);
      return SSO_ERROR_MESSAGES[code] ?? t('ssoErrors.generic');
    };
  }, [t]);
}

/**
 * A localised heartbeat cadence label. Non-preset values fall back to the terse
 * `Every Nh` / `Every Nd` form, which is itself a message — the unit letter is
 * part of the translation, as with `units.duration.*`.
 */
export function useHeartbeatIntervalLabel(): (hours: number) => string {
  const t = useTranslations('settings');
  return useMemo(() => {
    return (hours) => {
      const preset = HEARTBEAT_PRESETS.find((p) => p.hours === hours);
      if (preset) {
        const key = `heartbeat.presets.h${preset.hours}`;
        return t.has(key) ? t(key) : preset.label;
      }
      return hours < 24
        ? t('heartbeat.everyHours', { count: hours })
        : t('heartbeat.everyDays', { count: Math.round(hours / 24) });
    };
  }, [t]);
}
