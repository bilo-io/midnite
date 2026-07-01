import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Deck } from '@midnite/shared';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

let searchStr = 'id=d1';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(searchStr),
}));

const deck: Deck = {
  id: 'd1',
  name: 'Kickoff',
  slideCount: 1,
  format: 'md',
  content: { slides: [{ id: 's1', format: 'md', content: '# Hi' }] },
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

vi.mock('@/lib/use-api-data', () => ({
  useApiData: () => ({ data: deck, loading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('@/lib/api', () => ({ getDeck: vi.fn() }));
// reveal needs a real layout engine — stub it out of the unit test.
vi.mock('@/components/slides/reveal-preview', () => ({ RevealPreview: () => <div data-testid="deck" /> }));
const downloadDeckHtml = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/deck-export', () => ({ downloadDeckHtml: (...a: unknown[]) => downloadDeckHtml(...a) }));

import { ToastProvider } from '@/components/toast';
import PresentPage from './page';

const renderPage = () => render(<ToastProvider><PresentPage /></ToastProvider>);

describe('PresentPage', () => {
  it('renders the deck with Present toolbar affordances', () => {
    searchStr = 'id=d1';
    renderPage();
    expect(screen.getByTestId('deck')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export HTML' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Exit present mode' })).toHaveAttribute(
      'href',
      '/slides/view?id=d1',
    );
  });

  it('exports standalone HTML on click', () => {
    searchStr = 'id=d1';
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Export HTML' }));
    expect(downloadDeckHtml).toHaveBeenCalledWith(deck);
  });

  it('hides the toolbar in print-pdf mode', () => {
    searchStr = 'id=d1&print-pdf';
    renderPage();
    expect(screen.queryByRole('button', { name: 'Export PDF' })).toBeNull();
  });
});
