import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '@midnite/shell';
import type { Locale } from '@midnite/shared';

import { CATALOGS } from '@/i18n/messages';
import { useUnitFormat } from './use-unit-format';

/**
 * The byte/duration seam (Phase 82 Theme D).
 *
 * The `preciseDuration` cases below were `ops-cycle-fleet`'s `formatDuration` test, moved
 * here when that local helper folded into the shared hook — one place to assert the ladder
 * instead of one per chart. The en-GB expectations are byte-for-byte the originals', which
 * is the point: this seam's contract is that migrating a caller changes nothing visible in
 * en-GB.
 *
 * The fr-FR cases are what the seam exists *for*: the decimal comma and the unit spelling
 * both come from the catalog, so `1.5m` becomes `1,5 min` without any code branching on
 * locale.
 */
function harness(locale: Locale) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <LocaleProvider catalogs={CATALOGS} initialLocale={locale}>
        {children}
      </LocaleProvider>
    );
  };
}

function unitFormat(locale: Locale = 'en-GB') {
  return renderHook(() => useUnitFormat(), { wrapper: harness(locale) }).result.current;
}

describe('useUnitFormat — en-GB matches the pre-i18n helpers exactly', () => {
  it('formats precise durations across ms/s/m/h/d and null', () => {
    const { preciseDuration } = unitFormat();
    expect(preciseDuration(null)).toBe('—');
    expect(preciseDuration(250)).toBe('250ms');
    expect(preciseDuration(3_000)).toBe('3.0s');
    expect(preciseDuration(90_000)).toBe('1.5m');
    expect(preciseDuration(3_600_000)).toBe('1.0h');
    expect(preciseDuration(2 * 86_400_000)).toBe('2.0d');
  });

  it('omits the sub-second step in plain duration()', () => {
    // Deliberate: the dashboard cycle-time widget shipped reading `0.3s`, and adding an
    // `ms` step to `duration()` would have silently reformatted it.
    const { duration } = unitFormat();
    expect(duration(250)).toBe('0.3s');
    expect(duration(null)).toBe('—');
  });

  it('formats byte sizes with the 1-decimal-below-100 rule', () => {
    const { bytes } = unitFormat();
    expect(bytes(0)).toBe('0 B');
    expect(bytes(512)).toBe('512 B');
    expect(bytes(1_536)).toBe('1.5 KB');
    expect(bytes(42 * 1024 ** 3)).toBe('42.0 GB');
    // At/above 100 the decimal is dropped.
    expect(bytes(200 * 1024 ** 2)).toBe('200 MB');
  });

  it('formats whole-number ages at a caller-chosen step', () => {
    const { age } = unitFormat();
    expect(age(3, 'hours')).toBe('3h');
    expect(age(45, 'minutes')).toBe('45m');
    expect(age(250, 'milliseconds')).toBe('250ms');
  });
});

describe('useUnitFormat — fr-FR follows the catalog, not the code', () => {
  it('uses the French decimal comma and unit spellings', () => {
    const { preciseDuration, bytes, age } = unitFormat('fr-FR');
    expect(preciseDuration(90_000)).toBe('1,5 min');
    expect(preciseDuration(3_600_000)).toBe('1,0 h');
    expect(preciseDuration(250)).toBe('250 ms');
    expect(bytes(42 * 1024 ** 3)).toBe('42,0 Go');
    expect(age(3, 'days')).toBe('3 j');
  });
});
