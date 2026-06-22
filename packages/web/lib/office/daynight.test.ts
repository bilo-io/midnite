import { describe, expect, it } from 'vitest';
import { dayNightPhase, dayNightTint, type DayNightPhase } from './daynight';

describe('dayNightPhase (Phase 8 B2 day/night floor tint)', () => {
  it('buckets the hour on boundaries aligned with the time theme 08:00–18:00 window', () => {
    // night wraps past midnight
    expect(dayNightPhase(0)).toBe('night');
    expect(dayNightPhase(4)).toBe('night');
    // dawn ramps in 05–08
    expect(dayNightPhase(5)).toBe('dawn');
    expect(dayNightPhase(7)).toBe('dawn');
    // day = the theme's light window 08–18
    expect(dayNightPhase(8)).toBe('day');
    expect(dayNightPhase(12)).toBe('day');
    expect(dayNightPhase(17)).toBe('day');
    // dusk ramps out 18–20 — starts exactly where the time theme flips to dark
    expect(dayNightPhase(18)).toBe('dusk');
    expect(dayNightPhase(19)).toBe('dusk');
    // night again
    expect(dayNightPhase(20)).toBe('night');
    expect(dayNightPhase(23)).toBe('night');
  });

  it('normalises out-of-range and fractional hours so getHours() can be passed raw', () => {
    expect(dayNightPhase(24)).toBe('night'); // → 0
    expect(dayNightPhase(25)).toBe('night'); // → 1
    expect(dayNightPhase(32)).toBe('day'); // → 8
    expect(dayNightPhase(-1)).toBe('night'); // → 23
    expect(dayNightPhase(-3)).toBe('night'); // → 21
    expect(dayNightPhase(12.9)).toBe('day'); // floored → 12
  });
});

describe('dayNightTint', () => {
  it('returns a tint whose phase matches the hour', () => {
    expect(dayNightTint(6).phase).toBe('dawn');
    expect(dayNightTint(13).phase).toBe('day');
    expect(dayNightTint(19).phase).toBe('dusk');
    expect(dayNightTint(2).phase).toBe('night');
  });

  it('keeps every wash subtle (alpha well under half) so it never overrides the theme floor', () => {
    const phases: DayNightPhase[] = ['dawn', 'day', 'dusk', 'night'];
    const hourFor: Record<DayNightPhase, number> = { dawn: 6, day: 12, dusk: 19, night: 2 };
    for (const p of phases) {
      const tint = dayNightTint(hourFor[p]);
      expect(tint.alpha).toBeGreaterThan(0);
      expect(tint.alpha).toBeLessThan(0.5);
    }
  });

  it('is lightest at midday and deepest at night, so the floor reads true in the middle of the day', () => {
    expect(dayNightTint(12).alpha).toBeLessThan(dayNightTint(19).alpha); // day < dusk
    expect(dayNightTint(12).alpha).toBeLessThan(dayNightTint(2).alpha); // day < night
    expect(dayNightTint(2).alpha).toBeGreaterThanOrEqual(dayNightTint(6).alpha); // night ≥ dawn
  });
});
