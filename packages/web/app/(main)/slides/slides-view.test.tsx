import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '@/components/toast';
import { ConfirmProvider } from '@/components/confirm-dialog';
import { createDeck } from '@/lib/slides/store';
import { SlidesView } from './slides-view';

// The view is URL-backed (search `?q=`, project `?project=`); mock the router.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/slides',
}));

function renderView(projects: Parameters<typeof SlidesView>[0]['projects'] = []) {
  render(
    <ToastProvider>
      <ConfirmProvider>
        <SlidesView projects={projects} />
      </ConfirmProvider>
    </ToastProvider>,
  );
}

// Minimal project shape — only the fields SlidesView / cards read.
const project = (over: Partial<{ id: string; name: string; tag: string; color: string }> = {}) =>
  ({
    id: 'p1',
    name: 'Acme',
    tag: 'ACME',
    color: '#3b82f6',
    ...over,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double: the view only touches id/name/tag/color
  }) as any;

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

  it('shows a deck project tag and the project filter when projects exist', async () => {
    createDeck({ markdown: '# Roadmap\n\n## Q1', title: 'Roadmap', projectId: 'p1' });

    renderView([project()]);

    expect(await screen.findByText('Roadmap')).toBeInTheDocument();
    // The project tag chip renders the tag text.
    expect(screen.getByText('ACME')).toBeInTheDocument();
    // The react-select styled project filter is present.
    expect(screen.getByRole('button', { name: /all projects/i })).toBeInTheDocument();
  });

  it('selecting a deck reveals the bulk action bar with Duplicate and Delete', async () => {
    createDeck({ markdown: '# Quarterly review\n\n## Numbers\n\n- up', title: 'Quarterly review' });

    renderView();
    expect(await screen.findByText('Quarterly review')).toBeInTheDocument();

    // The SelectableIcon exposes a role=checkbox labelled "Select". (The slides
    // store caches decks in-memory across tests, so pick the first affordance.)
    fireEvent.click(screen.getAllByRole('checkbox', { name: /select/i })[0]!);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('shows the empty state when there are no decks', async () => {
    // Seed then clear so the store is initialized-but-empty (won't re-seed).
    window.localStorage.setItem('midnite.slides.decks', '[]');

    renderView();

    expect(await screen.findByText(/no decks yet/i)).toBeInTheDocument();
  });
});
