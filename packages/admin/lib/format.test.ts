import { describe, expect, it } from 'vitest';
import {
  formatUsd,
  formatCompact,
  formatInt,
  formatDuration,
  formatDate,
  formatDateTime,
  isoDaysAgo,
} from './format';

describe('formatUsd', () => {
  it('renders zero and normal amounts to two decimals', () => {
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(12.5)).toBe('$12.50');
    expect(formatUsd(1234.567)).toBe('$1,234.57');
  });

  it('shows extra precision for sub-cent spend', () => {
    expect(formatUsd(0.0031)).toBe('$0.0031');
  });
});

describe('formatCompact', () => {
  it('abbreviates thousands and millions', () => {
    expect(formatCompact(999)).toBe('999');
    expect(formatCompact(1234)).toBe('1.2k');
    expect(formatCompact(25_000)).toBe('25k');
    expect(formatCompact(2_500_000)).toBe('2.5M');
  });
});

describe('formatInt', () => {
  it('adds thousands separators', () => {
    expect(formatInt(1000)).toBe('1,000');
  });
});

describe('formatDuration', () => {
  it('handles null and each magnitude', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(900)).toBe('900ms');
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(65_000)).toBe('1m 5s');
    expect(formatDuration(3_720_000)).toBe('1h 2m');
  });
});

describe('formatDate / formatDateTime', () => {
  it('coerces invalid/empty to a dash', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDateTime(null)).toBe('—');
  });

  it('renders a valid ISO date', () => {
    expect(formatDate('2026-07-19T00:00:00.000Z')).toMatch(/2026/);
  });
});

describe('isoDaysAgo', () => {
  it('returns an ISO string in the past', () => {
    const iso = isoDaysAgo(30);
    expect(new Date(iso).getTime()).toBeLessThan(Date.now());
    expect(iso).toMatch(/T.*Z$/);
  });
});
