import { describe, expect, it } from 'vitest';
import {
  presetToCron,
  cronToPreset,
  nextRuns,
  describeCron,
  type RecurrencePreset,
} from './cron';

describe('presetToCron', () => {
  it('compiles each preset shape', () => {
    expect(presetToCron({ kind: 'daily', time: '09:00' })).toBe('0 9 * * *');
    expect(presetToCron({ kind: 'daily', time: '14:30' })).toBe('30 14 * * *');
    expect(presetToCron({ kind: 'weekdays', time: '08:15' })).toBe('15 8 * * 1-5');
    expect(presetToCron({ kind: 'weekly', day: 1, time: '09:00' })).toBe('0 9 * * 1');
    expect(presetToCron({ kind: 'monthly', dom: 15, time: '06:00' })).toBe('0 6 15 * *');
  });

  it('defaults a malformed time to 09:00', () => {
    expect(presetToCron({ kind: 'daily', time: 'nope' })).toBe('0 9 * * *');
  });
});

describe('cronToPreset', () => {
  it('reverse-maps the recognised shapes', () => {
    expect(cronToPreset('0 9 * * *')).toEqual({ kind: 'daily', time: '09:00' });
    expect(cronToPreset('30 14 * * 1-5')).toEqual({ kind: 'weekdays', time: '14:30' });
    expect(cronToPreset('0 9 * * 3')).toEqual({ kind: 'weekly', day: 3, time: '09:00' });
    expect(cronToPreset('0 6 15 * *')).toEqual({ kind: 'monthly', dom: 15, time: '06:00' });
  });

  it('returns null for non-preset / invalid expressions (Custom)', () => {
    expect(cronToPreset('*/5 * * * *')).toBeNull(); // every 5 min
    expect(cronToPreset('0 9 * 1 *')).toBeNull(); // month-constrained
    expect(cronToPreset('0 9 1-5 * *')).toBeNull(); // dom range
    expect(cronToPreset('99 9 * * *')).toBeNull(); // bad minute
    expect(cronToPreset('0 9 * *')).toBeNull(); // too few fields
  });

  it('round-trips every preset through cron and back', () => {
    const presets: RecurrencePreset[] = [
      { kind: 'daily', time: '00:00' },
      { kind: 'weekdays', time: '23:59' },
      { kind: 'weekly', day: 0, time: '12:00' },
      { kind: 'weekly', day: 6, time: '07:45' },
      { kind: 'monthly', dom: 1, time: '09:30' },
      { kind: 'monthly', dom: 31, time: '18:00' },
    ];
    for (const p of presets) {
      expect(cronToPreset(presetToCron(p))).toEqual(p);
    }
  });
});

describe('nextRuns', () => {
  it('returns n upcoming, strictly increasing dates for a valid cron', () => {
    const runs = nextRuns('0 9 * * *', 'UTC', 3);
    expect(runs).toHaveLength(3);
    expect(runs[1]!.getTime()).toBeGreaterThan(runs[0]!.getTime());
    expect(runs[2]!.getTime()).toBeGreaterThan(runs[1]!.getTime());
  });

  it('returns [] for an invalid expression', () => {
    expect(nextRuns('not a cron', 'UTC', 3)).toEqual([]);
  });

  it('falls back to UTC for an empty timezone without throwing', () => {
    expect(nextRuns('0 9 * * *', '', 1)).toHaveLength(1);
  });
});

describe('describeCron (existing, regression)', () => {
  it('summarises the preset shapes', () => {
    expect(describeCron('0 9 * * *')).toBe('Every day at 09:00');
    expect(describeCron('30 14 * * 1-5')).toBe('Weekdays at 14:30');
  });
});
