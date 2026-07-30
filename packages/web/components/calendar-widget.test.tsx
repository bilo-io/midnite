import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/vitest.render-intl';
import { CalendarWidget } from './calendar-widget';

describe('CalendarWidget i18n (Phase 82 D)', () => {
  it('renders English chrome and Intl-derived weekday names under en-GB', () => {
    renderWithIntl(<CalendarWidget />);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    // Monday-start weekday header comes from Intl, not the catalog.
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('renders French chrome and weekday names under fr-FR', () => {
    renderWithIntl(<CalendarWidget />, { locale: 'fr-FR' });
    expect(screen.getByText('Calendrier')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aujourd’hui' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mois précédent' })).toBeInTheDocument();
    // fr-FR short weekdays from Intl (lun., mar., …).
    expect(screen.getByText('lun.')).toBeInTheDocument();
    expect(screen.getByText('dim.')).toBeInTheDocument();
  });
});
