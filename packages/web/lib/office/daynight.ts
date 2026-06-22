/**
 * Day/night floor tint (Phase 8 B2) — a subtle, time-of-day colour wash laid over
 * the office floor so the room feels like the actual hour. It's **aligned with the
 * app's `time` theme**, which flips light↔dark on an 08:00–18:00 day window
 * (see `@midnite/ui/theme`): the wash buckets the same clock into dawn / day /
 * dusk / night and composes *on top of* whatever light/dark floor the theme
 * resolved — a warm cast at sunrise/sunset, a cool one after dark, near-nothing at
 * midday. Pure + unit-tested; the scene applies the returned colour/alpha as a
 * low-depth wash over the ground (below furniture + characters) and refreshes it
 * on a timer so it tracks the hour while the page stays open.
 */

export type DayNightPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface DayNightTint {
  phase: DayNightPhase;
  /** Wash colour (0xRRGGBB), tinting the ground for the time of day. */
  color: number;
  /** Wash opacity 0..1 — kept subtle so it reads as ambiance, not a theme override. */
  alpha: number;
}

/**
 * Bucket a local hour into a day/night phase. Boundaries align with the `time`
 * theme's day window (08:00–18:00 = light): `dawn` ramps in (05–08), `day` is the
 * light window (08–18), `dusk` ramps out (18–20), `night` wraps past midnight
 * (20–05). Out-of-range hours are normalised, so callers can pass `getHours()`
 * (or a wrapped value) without guarding.
 */
export function dayNightPhase(hour: number): DayNightPhase {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 18) return 'day';
  if (h >= 18 && h < 20) return 'dusk';
  return 'night';
}

/** The floor wash per phase — warm at the edges of the day, cool + deeper at night. */
const TINTS: Record<DayNightPhase, DayNightTint> = {
  dawn: { phase: 'dawn', color: 0xf6b27a, alpha: 0.1 }, // soft amber sunrise
  day: { phase: 'day', color: 0xfff3d0, alpha: 0.04 }, // near-neutral — floor reads true
  dusk: { phase: 'dusk', color: 0xf08a4b, alpha: 0.12 }, // warm orange sunset
  night: { phase: 'night', color: 0x1b2a5c, alpha: 0.18 }, // cool deep blue
};

/** The day/night floor wash for a given local hour (0–23; tolerates out-of-range). */
export function dayNightTint(hour: number): DayNightTint {
  return TINTS[dayNightPhase(hour)];
}
