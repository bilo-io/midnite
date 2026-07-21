import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@midnite/shell';
import type { Locale } from '@midnite/shared';
import { describe, expect, it } from 'vitest';

import type { FinanceConfig } from '@/lib/dashboard-widgets';
import { FinancesWidget } from './finances-widget';

const CONFIG: FinanceConfig = {
  title: 'Budget',
  income: [{ id: 'a', label: 'Salary', amount: 1234.5 }],
  expenses: [{ id: 'b', label: 'Rent', amount: 200 }],
  showDetail: false,
};

function renderAt(locale: Locale) {
  return render(
    <LocaleProvider catalogs={{}} initialLocale={locale}>
      <FinancesWidget config={CONFIG} onConfigChange={() => {}} />
    </LocaleProvider>,
  );
}

describe('FinancesWidget locale-aware formatting (Phase 79 F)', () => {
  it('formats amounts for en-GB (comma grouping, dot decimal)', () => {
    renderAt('en-GB');
    // Income total = 1234.50, leftover = 1234.50 - 200 = 1034.50
    expect(screen.getAllByText('1,234.50').length).toBeGreaterThan(0);
    expect(screen.getByText('1,034.50')).toBeInTheDocument();
  });

  it('formats the same amounts for de-DE (dot grouping, comma decimal)', () => {
    renderAt('de-DE');
    expect(screen.getAllByText('1.234,50').length).toBeGreaterThan(0);
    expect(screen.getByText('1.034,50')).toBeInTheDocument();
  });
});
