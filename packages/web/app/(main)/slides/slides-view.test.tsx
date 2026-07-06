import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '@/components/toast';
import { ConfirmProvider } from '@/components/confirm-dialog';
import { createDeck } from '@/lib/slides/store';
import { SlidesView } from './slides-view';

function renderView() {
  render(
    <ToastProvider>
      <ConfirmProvider>
        <SlidesView />
      </ConfirmProvider>
    </ToastProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('SlidesView', () => {
  it('renders decks from localStorage with a New deck action', async () => {
    createDeck({ markdown: '# Quarterly review\n\n## Numbers\n\n- up', title: 'Quarterly review' });

    renderView();

    // hydrates from localStorage on mount
    expect(await screen.findByText('Quarterly review')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new deck/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grid view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument();
  });

  it('shows the empty state when there are no decks', async () => {
    // Seed then clear so the store is initialized-but-empty (won't re-seed).
    window.localStorage.setItem('midnite.slides.decks', '[]');

    renderView();

    expect(await screen.findByText(/no decks yet/i)).toBeInTheDocument();
  });
});
