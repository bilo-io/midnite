import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';

import { renderWithIntl } from '@/vitest.render-intl';

/**
 * Phase 82 Theme D (shared-chrome slice) — behavioural fr-FR renders.
 *
 * `lib/i18n-chrome-registry.test.ts` proves the keys *resolve*; these mount the
 * primitives under `fr-FR` and assert the French reaches the DOM. Worth doing at
 * this layer specifically because these components render on nearly every route:
 * a wrong key here is visible app-wide, not on one page.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(cleanup);

describe('Phase 82 D — shared chrome renders fr-FR', () => {
  // The exact residue the council/assistant PR (#594) flagged in its screenshot:
  // the list-page count pill read "0 items" on an otherwise-French page.
  it('pluralises the count pill in French', async () => {
    const { CountPill } = await import('./count-pill');
    const { unmount } = renderWithIntl(<CountPill count={1} />, { locale: 'fr-FR' });
    expect(screen.getByText('1 élément')).toBeInTheDocument();
    unmount();

    renderWithIntl(<CountPill count={6} />, { locale: 'fr-FR' });
    expect(screen.getByText('6 éléments')).toBeInTheDocument();
  });

  it('pluralises the status donut label in French', async () => {
    const { StatusDonut } = await import('./status-donut');
    renderWithIntl(<StatusDonut counts={[]} total={3} />, { locale: 'fr-FR' });
    expect(screen.getByText('3 tâches')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '3 tâches par statut' })).toBeInTheDocument();
  });

  it('labels the select checkbox in French, both states', async () => {
    const { SelectableIcon } = await import('./selectable-icon');
    const { Circle } = await import('lucide-react');
    const { unmount } = renderWithIntl(
      <SelectableIcon Icon={Circle} selected={false} onToggle={vi.fn()} />,
      { locale: 'fr-FR' },
    );
    expect(screen.getByRole('checkbox', { name: 'Sélectionner' })).toBeInTheDocument();
    unmount();

    renderWithIntl(<SelectableIcon Icon={Circle} selected onToggle={vi.fn()} />, {
      locale: 'fr-FR',
    });
    expect(screen.getByRole('checkbox', { name: 'Désélectionner' })).toBeInTheDocument();
  });

  it('labels the spinner in French', async () => {
    const { Spinner } = await import('./spinner');
    renderWithIntl(<Spinner variant="breathe" />, { locale: 'fr-FR' });
    expect(screen.getByRole('status', { name: 'Traitement en cours' })).toBeInTheDocument();
  });

  it('renders the desktop-only notice in French, interpolating the label', async () => {
    const { DesktopOnly } = await import('./desktop-only');
    // jsdom has no matchMedia match for `lg`, so the gate renders the notice.
    renderWithIntl(
      <DesktopOnly label="Le bureau">
        <div>canvas</div>
      </DesktopOnly>,
      { locale: 'fr-FR' },
    );
    expect(
      await screen.findByText('Le bureau s’affiche mieux sur ordinateur'),
    ).toBeInTheDocument();
    expect(screen.getByText(/nécessite un écran plus grand/)).toBeInTheDocument();
  });

  // The heading is an ICU message with the noun as an argument now; CSS raises the
  // first letter, so the DOM text keeps the noun exactly as the caller passed it.
  it('renders the not-found panel in French with the noun interpolated', async () => {
    const { ResourceNotFound } = await import('./resource-not-found');
    renderWithIntl(<ResourceNotFound feature="councils" singular="conseil" />, {
      locale: 'fr-FR',
    });
    expect(screen.getByRole('heading', { name: 'conseil introuvable' })).toBeInTheDocument();
    expect(screen.getByText(/Ce conseil est introuvable/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Aller au tableau de bord/ })).toBeInTheDocument();
    // The collection name comes from the feature registry seam, not the English label.
    expect(screen.getByRole('link', { name: /Voir Conseils/ })).toBeInTheDocument();
  });
});
