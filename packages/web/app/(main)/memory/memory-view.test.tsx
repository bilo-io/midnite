import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import type { Memory, Project } from '@midnite/shared';
import { renderWithIntl as render } from '@/vitest.render-intl';
import { MemoryView } from './memory-view';

// The view is URL-backed (search `?q=`, `?create=`); mock the router.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/memory',
}));

const project: Project = {
  id: 'p1',
  name: 'Acme app',
  tag: 'acme',
  color: '#6366f1',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

const memory = (over: Partial<Memory> = {}): Memory => ({
  id: 'm1',
  title: 'Coding conventions',
  content: '# Conventions\nUse tabs.',
  projectId: null,
  sources: [],
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
  ...over,
});

beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

describe('MemoryView — en-GB', () => {
  it('renders the toolbar, view toggles and a memory card', () => {
    render(<MemoryView initial={[memory()]} projects={[project]} />);

    expect(screen.getByRole('button', { name: 'New memory' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'List view' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Grid view' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Table view' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search memories')).toBeInTheDocument();
    // Gateway data is never translated.
    expect(screen.getByText('Coding conventions')).toBeInTheDocument();
  });

  it('badges an archived memory', () => {
    render(<MemoryView initial={[memory({ archived: true })]} projects={[project]} />);
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('shows the empty state when there are no memories', () => {
    render(<MemoryView initial={[]} projects={[project]} />);
    expect(screen.getByText('No memories yet')).toBeInTheDocument();
  });
});

describe('MemoryView — fr-FR', () => {
  it('renders the French chrome while leaving gateway data untranslated', () => {
    render(<MemoryView initial={[memory()]} projects={[project]} />, { locale: 'fr-FR' });

    expect(screen.getByRole('button', { name: 'Nouvelle mémoire' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vue liste' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vue grille' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vue tableau' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Rechercher des mémoires')).toBeInTheDocument();
    expect(screen.getByText('Coding conventions')).toBeInTheDocument();
  });

  it('shows the French empty state', () => {
    render(<MemoryView initial={[]} projects={[project]} />, { locale: 'fr-FR' });
    expect(screen.getByText('Aucune mémoire pour l’instant')).toBeInTheDocument();
  });
});
