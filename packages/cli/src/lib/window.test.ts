import { describe, expect, it } from 'vitest';
import { parseDurationToMs, resolveWindow } from './window.js';

describe('parseDurationToMs', () => {
  it('parses each unit', () => {
    expect(parseDurationToMs('30s')).toBe(30_000);
    expect(parseDurationToMs('90m')).toBe(90 * 60_000);
    expect(parseDurationToMs('24h')).toBe(24 * 3_600_000);
    expect(parseDurationToMs('7d')).toBe(7 * 86_400_000);
    expect(parseDurationToMs('2w')).toBe(2 * 604_800_000);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseDurationToMs(' 5h ')).toBe(5 * 3_600_000);
  });

  it('throws on a malformed duration', () => {
    expect(() => parseDurationToMs('7')).toThrow(/invalid duration/);
    expect(() => parseDurationToMs('7y')).toThrow(/invalid duration/);
    expect(() => parseDurationToMs('abc')).toThrow(/invalid duration/);
  });
});

describe('resolveWindow', () => {
  const now = Date.parse('2026-07-11T12:00:00.000Z');

  it('maps --since to a from relative to now', () => {
    expect(resolveWindow({ since: '24h' }, now)).toEqual({ from: '2026-07-10T12:00:00.000Z' });
  });

  it('lets explicit --from win over --since', () => {
    expect(resolveWindow({ since: '24h', from: '2026-01-01T00:00:00.000Z' }, now)).toEqual({
      from: '2026-01-01T00:00:00.000Z',
    });
  });

  it('passes through --from/--to', () => {
    expect(resolveWindow({ from: '2026-01-01T00:00:00.000Z', to: '2026-02-01T00:00:00.000Z' }, now)).toEqual({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-02-01T00:00:00.000Z',
    });
  });

  it('is empty with no window flags', () => {
    expect(resolveWindow({}, now)).toEqual({});
  });
});
