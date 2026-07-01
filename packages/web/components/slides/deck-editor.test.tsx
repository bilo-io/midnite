import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

const createDeck = vi.fn();
const updateDeck = vi.fn();
vi.mock('@/lib/api', () => ({
  createDeck: (...a: unknown[]) => createDeck(...a),
  updateDeck: (...a: unknown[]) => updateDeck(...a),
}));
vi.mock('@/lib/data-refresh', () => ({ invalidateData: vi.fn() }));
// reveal.js needs a real layout engine — stub the preview out of the unit test.
vi.mock('@/components/slides/reveal-preview', () => ({ RevealPreview: () => null }));
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

import { ToastProvider } from '@/components/toast';
import { DeckEditor } from './deck-editor';

const renderEditor = () => render(<ToastProvider>{<DeckEditor />}</ToastProvider>);

describe('DeckEditor (create mode)', () => {
  it('disables Save until the deck has a name', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Deck name'), { target: { value: 'My deck' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('creates the deck and routes to its stable URL on save', async () => {
    createDeck.mockResolvedValue({ id: 'new1' });
    renderEditor();
    fireEvent.change(screen.getByLabelText('Deck name'), { target: { value: 'My deck' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(createDeck).toHaveBeenCalledTimes(1));
    const body = createDeck.mock.calls[0]![0] as {
      name: string;
      content: { slides: unknown[] };
    };
    expect(body.name).toBe('My deck');
    expect(body.content.slides).toHaveLength(1);
    expect(replace).toHaveBeenCalledWith('/slides/view?id=new1');
  });

  it('adds slides and toggles the selected slide format', () => {
    renderEditor();
    expect(screen.getByText('Slides (1)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Slides (2)')).toBeInTheDocument();

    const htmlToggle = screen.getByRole('button', { name: 'HTML' });
    expect(htmlToggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(htmlToggle);
    expect(htmlToggle).toHaveAttribute('aria-pressed', 'true');
  });
});
