// Pin the runner's local zone to UTC so relative offsets are deterministic.
process.env.TZ = 'UTC';

import { describe, expect, it } from 'vitest';
import { offsetLabel } from './world-clocks-widget';

// A winter instant avoids DST ambiguity for the zones tested below.
const JAN = new Date('2025-01-15T12:00:00Z');

describe('offsetLabel', () => {
  it('shows "same" for the viewer\'s own (UTC) zone', () => {
    expect(offsetLabel(JAN, 'UTC')).toBe('same');
  });

  it('formats whole-hour offsets ahead and behind', () => {
    expect(offsetLabel(JAN, 'Asia/Tokyo')).toBe('+9h'); // UTC+9, no DST
    expect(offsetLabel(JAN, 'America/New_York')).toBe('−5h'); // EST, UTC−5
  });

  it('formats half-hour offsets as h:mm', () => {
    expect(offsetLabel(JAN, 'Asia/Kolkata')).toBe('+5:30');
  });

  it('returns an empty string for an invalid timezone', () => {
    expect(offsetLabel(JAN, 'Not/AZone')).toBe('');
  });
});
