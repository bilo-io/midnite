import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DeckSummary } from '@midnite/shared';

afterEach(cleanup);

const deleteDeck = vi.fn();
vi.mock('@/lib/api', () => ({ deleteDeck: (...a: unknown[]) => deleteDeck(...a) }));
vi.mock('@/lib/data-refresh', () => ({ invalidateData: vi.fn() }));

import { ToastProvider } from '@/components/toast';
import { ConfirmProvider } from '@/components/confirm-dialog';
import { SlidesView } from './slides-view';

const deck = (over: Partial<DeckSummary> = {}): DeckSummary => ({
  id: 'd1',
  name: 'Kickoff',
  description: 'Q3 plan',
  slideCount: 3,
  format: 'md',
  updatedAt: '2026-07-01T00:00:00Z',
  ...over,
});

const renderView = (decks: DeckSummary[]) =>
  render(
    <ToastProvider>
      <ConfirmProvider>
        <SlidesView decks={decks} />
      </ConfirmProvider>
    </ToastProvider>,
  );

describe('SlidesView', () => {
  it('shows the empty state with a New deck action', () => {
    renderView([]);
    expect(screen.getByText('No decks yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New deck/i })).toHaveAttribute('href', '/slides/new');
  });

  it('renders decks with a format badge and slide count', () => {
    renderView([deck({ name: 'Kickoff', slideCount: 3, format: 'mixed' })]);
    expect(screen.getByRole('link', { name: 'Kickoff' })).toBeInTheDocument();
    expect(screen.getByText('Mixed')).toBeInTheDocument();
    expect(screen.getByText(/3 slides/)).toBeInTheDocument();
  });

  it('confirms then deletes a deck', async () => {
    deleteDeck.mockResolvedValue(undefined);
    renderView([deck({ id: 'd9', name: 'Toss me' })]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Toss me' }));
    // Confirm dialog appears — click its Delete button.
    const confirmBtn = await screen.findByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(deleteDeck).toHaveBeenCalledWith('d9'));
  });
});
