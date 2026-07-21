'use client';

import { useFormatter, useLocale } from 'next-intl';
import type { Locale } from '@midnite/shared';

/**
 * The web app's locale-aware formatting seam (Phase 79 Theme F).
 *
 * Before i18n, surfaces hand-rolled `Intl.NumberFormat`/`toLocaleString` with a
 * **pinned** locale (`'en-GB'`, `undefined`) — so switching the UI language left
 * numbers, currency, and dates formatted for the wrong region. This hook binds
 * formatting to the **active** locale from the shell `LocaleProvider`, so a language
 * change reformats every consumer. It's the single place that knows "web formats via
 * next-intl": call this instead of `useFormatter()` directly so the whole app shares
 * one seam (and one migration point if the formatting backend ever changes).
 *
 * `number`/`dateTime` accept the standard `Intl.*FormatOptions`; `money` is the
 * non-trivial convenience (currency style with an explicit ISO code — only the
 * *locale* is dynamic, never the currency).
 */
export type LocaleFormat = {
  /** The active locale (e.g. for passing to a library that wants a locale string). */
  locale: Locale;
  /** A plain number — e.g. `1,234.56` (en-GB) vs `1.234,56` (de-DE). */
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** A currency amount. Pass the ISO 4217 code explicitly; only the locale is dynamic. */
  money: (value: number, currency: string, options?: Intl.NumberFormatOptions) => string;
  /** A date/time — e.g. weekday/month names + date-part order follow the locale. */
  dateTime: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
};

export function useLocaleFormat(): LocaleFormat {
  const format = useFormatter();
  const locale = useLocale() as Locale;
  // These widgets show the viewer's *local* time (the pre-i18n `toLocaleTimeString(undefined)`
  // behaviour). next-intl warns when no `timeZone` is set, so default to the resolved local
  // zone — a caller can still override per call via `options.timeZone`.
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    locale,
    number: (value, options) => format.number(value, options),
    money: (value, currency, options) => format.number(value, { style: 'currency', currency, ...options }),
    dateTime: (value, options) => format.dateTime(value, { timeZone, ...options }),
  };
}
