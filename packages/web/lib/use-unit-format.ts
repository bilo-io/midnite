'use client';

import { useTranslations } from 'next-intl';

import { useLocaleFormat } from './use-locale-format';

/**
 * Locale-aware **unit** rendering (Phase 82 Theme D) — the counterpart to
 * {@link useLocaleFormat}, which handles bare numbers, money and dates.
 *
 * Byte sizes and short durations are the two places the dashboard hand-rolled a
 * number *and* an English-ish suffix in one template literal (`` `${v.toFixed(1)} GB` ``,
 * `` `${Math.round(s)}s` ``). Two things were wrong with that: the number never followed
 * the active locale's grouping/decimal separator, and the suffix was unreachable from a
 * catalog.
 *
 * So the whole rendering is a message — `units.bytes.gb` is `"{value} GB"`, not `"GB"` —
 * because **the spacing is part of the translation**: en-GB writes `42.0 GB` but `5.2m`,
 * and fr-FR wants a space before both. Only the digits are computed here (the decimal
 * rules are the originals', so en-GB output is byte-identical to the helpers this
 * replaces); everything a translator might move lives in the catalog.
 *
 * The pure originals ([`formatBytes`](./utils.ts), the widgets' local `fmtDuration`) stay
 * for the not-yet-migrated tail, exactly as `relativeTime` did.
 */
export type UnitFormat = {
  /** A byte size — 1 decimal below 100, whole numbers above (`42.0 GB`, `1.4 TB`, `512 B`). */
  bytes: (bytes: number) => string;
  /**
   * A short duration from milliseconds — 1 decimal below 10, whole numbers above,
   * stepping s → m → h → d. Returns the em-dash for `null` so callers keep their
   * "no data" rendering.
   */
  duration: (ms: number | null) => string;
  /**
   * As {@link UnitFormat.duration}, but with a **sub-second step**: below 1s it reads
   * `250ms` rather than `0.3s`. Two charts need that resolution — the ops cycle-time bars
   * and the run timeline — while the dashboard's cycle-time widget shipped without it, so
   * it's a separate member rather than a change to `duration()`.
   */
  preciseDuration: (ms: number | null) => string;
  /**
   * A whole-number age in the same ms/s/m/h/d vocabulary — for callers that already
   * floor to an integer step (the news feed's `3h`, the ops uptime pair's `3d 4h`) and
   * would look wrong with a decimal. Shares the `units.duration.*` messages so one locale
   * edit moves both.
   *
   * `milliseconds` exists only here, not in {@link UnitFormat.duration}: the run timeline
   * shows sub-second bars, but adding an `ms` step to `duration()` would silently reformat
   * the shipped cycle-time widget's sub-second values from `0.5s` to `500ms`. A caller
   * that wants the finer step asks for it.
   */
  age: (value: number, step: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days') => string;
};

/** Ordered smallest-first; the index into this array is the `1024**i` step. */
const BYTE_UNITS = ['b', 'kb', 'mb', 'gb', 'tb', 'pb'] as const;

export function useUnitFormat(): UnitFormat {
  const t = useTranslations('common');
  const { number } = useLocaleFormat();

  // `decimals` is passed explicitly rather than derived from the value: the originals
  // used `toFixed(1)`, which pads (`42` → `42.0`), and Intl drops a trailing zero unless
  // told to keep it. Fixing both bounds preserves the exact pre-i18n digits.
  const unit = (value: number, decimals: 0 | 1, key: string): string =>
    t(key, {
      value: number(value, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
    });

  /** The s → m → h → d ladder, shared by `duration` and `preciseDuration`. */
  const durationFrom = (ms: number): string => {
    const s = ms / 1_000;
    if (s < 60) return s < 10 ? unit(s, 1, 'units.duration.seconds') : unit(Math.round(s), 0, 'units.duration.seconds');
    const m = s / 60;
    if (m < 60) return m < 10 ? unit(m, 1, 'units.duration.minutes') : unit(Math.round(m), 0, 'units.duration.minutes');
    const h = m / 60;
    if (h < 24) return h < 10 ? unit(h, 1, 'units.duration.hours') : unit(Math.round(h), 0, 'units.duration.hours');
    return unit(h / 24, 1, 'units.duration.days');
  };

  return {
    bytes: (bytes) => {
      if (!Number.isFinite(bytes) || bytes <= 0) return unit(0, 0, 'units.bytes.b');
      const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
      const value = bytes / 1024 ** i;
      // Whole bytes only at the base step — "1.5 B" reads as nonsense.
      const decimals = i === 0 || value >= 100 ? 0 : 1;
      return unit(decimals === 0 ? Math.round(value) : value, decimals, `units.bytes.${BYTE_UNITS[i]}`);
    },
    duration: (ms) => (ms === null ? t('units.emDash') : durationFrom(ms)),
    age: (value, step) => unit(value, 0, `units.duration.${step}`),
    preciseDuration: (ms) => {
      if (ms === null) return t('units.emDash');
      if (ms < 1_000) return unit(Math.round(ms), 0, 'units.duration.milliseconds');
      return durationFrom(ms);
    },
  };
}
