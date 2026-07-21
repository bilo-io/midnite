import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@midnite/shell';
import type { Locale } from '@midnite/shared';
import { describe, expect, it } from 'vitest';

import { useLocaleFormat } from './use-locale-format';

/**
 * A probe that exercises the whole `useLocaleFormat` surface with fixed inputs, so
 * the assertions turn purely on the active locale (Phase 79 Theme F). All the
 * dashboard widgets format through this seam, so covering it covers them.
 */
function Probe() {
  const { locale, number, money, dateTime } = useLocaleFormat();
  const date = new Date(2026, 0, 15); // 15 Jan 2026, local time
  return (
    <ul>
      <li data-testid="locale">{locale}</li>
      <li data-testid="number">{number(1234.5, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>
      <li data-testid="money">{money(1234.5, 'USD')}</li>
      <li data-testid="month">{dateTime(date, { month: 'long' })}</li>
    </ul>
  );
}

function renderAt(locale: Locale) {
  return render(
    <LocaleProvider catalogs={{}} initialLocale={locale}>
      <Probe />
    </LocaleProvider>,
  );
}

describe('useLocaleFormat', () => {
  it('formats numbers for the active locale (grouping + decimal separators)', () => {
    const { unmount } = renderAt('en-GB');
    expect(screen.getByTestId('number').textContent).toBe('1,234.50');
    unmount();

    renderAt('de-DE');
    expect(screen.getByTestId('number').textContent).toBe('1.234,50');
  });

  it('formats currency for the active locale while keeping the code explicit', () => {
    const { unmount } = renderAt('en-GB');
    // en-GB groups with a comma; the exact currency glyph placement is engine-detail,
    // so assert on the locale-specific digit grouping rather than the symbol.
    expect(screen.getByTestId('money').textContent).toContain('1,234.50');
    unmount();

    renderAt('de-DE');
    expect(screen.getByTestId('money').textContent).toContain('1.234,50');
  });

  it('formats dates for the active locale (localised month names)', () => {
    const { unmount } = renderAt('en-GB');
    expect(screen.getByTestId('month').textContent).toBe('January');
    unmount();

    renderAt('fr-FR');
    expect(screen.getByTestId('month').textContent).toBe('janvier');
  });

  it('exposes the resolved active locale', () => {
    renderAt('de-DE');
    expect(screen.getByTestId('locale').textContent).toBe('de-DE');
  });
});
