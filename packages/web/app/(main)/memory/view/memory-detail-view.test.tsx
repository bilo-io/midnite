import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Memory, Project } from '@midnite/shared';

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  params = new URLSearchParams();
});

// Desktop path so the rails (not drawers) render deterministically.
vi.mock('@/hooks/use-media-query', () => ({ useIsMobile: () => false, useMediaQuery: () => false }));

let params = new URLSearchParams();
const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => params,
}));

// The doc + sources panels are their own units — stub them so this stays a
// deterministic shell test (header, rails, chat composer, Studio). The doc panel
// now lives inside the metadata modal, opened from the header's ellipsis.
vi.mock('@/components/memory/memory-doc-panel', () => ({
  MemoryDocPanel: () => <div data-testid="doc-panel" />,
}));
vi.mock('@/components/memory/memory-sources-panel', () => ({
  MemorySourcesPanel: () => <div data-testid="sources-panel" />,
}));
vi.mock('@/components/memory/memory-chat-composer', () => ({
  MemoryChatComposer: () => <div data-testid="chat-composer" />,
}));

const useApiData = vi.fn();
vi.mock('@/lib/use-api-data', () => ({ useApiData: (...a: unknown[]) => useApiData(...a) }));

import { MemoryDetailView, MemoryDetailContainer } from './memory-detail-view';

const project: Project = {
  id: 'p1',
  name: 'Acme app',
  tag: 'acme',
  color: '#6366f1',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};
const memory: Memory = {
  id: 'm1',
  title: 'Coding conventions',
  content: '# Conventions\nUse tabs.',
  projectId: null,
  sources: [],
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

describe('MemoryDetailView — shell', () => {
  it('renders the header, chat composer, and both rails', () => {
    render(<MemoryDetailView memory={memory} projects={[project]} onChanged={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Coding conventions' })).toBeInTheDocument();
    // The title is editable inline in the header breadcrumb.
    expect(screen.getByRole('textbox', { name: 'Memory title' })).toHaveValue('Coding conventions');
    expect(screen.getByTestId('sources-panel')).toBeInTheDocument();
    // Left rail title + right Studio rail.
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Studio' })).toBeInTheDocument();
    // Chat composer mounted in the center panel (its behavior is unit-tested separately).
    expect(screen.getByTestId('chat-composer')).toBeInTheDocument();
    // The doc panel is not in the center anymore — it opens in a modal.
    expect(screen.queryByTestId('doc-panel')).toBeNull();
  });

  it('opens the metadata modal (with the doc panel) from the header ellipsis', () => {
    render(<MemoryDetailView memory={memory} projects={[project]} onChanged={vi.fn()} />);
    expect(screen.queryByTestId('doc-panel')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit memory metadata' }));
    expect(screen.getByRole('dialog', { name: 'Edit memory' })).toBeInTheDocument();
    expect(screen.getByTestId('doc-panel')).toBeInTheDocument();
  });

  it('shows a Global scope pill for a global memory', () => {
    render(<MemoryDetailView memory={memory} projects={[project]} onChanged={vi.fn()} />);
    expect(screen.getByText('Global')).toBeInTheDocument();
  });

  it('shows the project tag pill for a project-scoped memory', () => {
    render(
      <MemoryDetailView memory={{ ...memory, projectId: 'p1' }} projects={[project]} onChanged={vi.fn()} />,
    );
    expect(screen.getByText('acme')).toBeInTheDocument();
  });

  it('collapses a rail to a slim toggle and re-expands it', () => {
    render(<MemoryDetailView memory={memory} projects={[project]} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Studio' }));
    expect(screen.queryByRole('heading', { name: 'Studio' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Studio' }));
    expect(screen.getByRole('heading', { name: 'Studio' })).toBeInTheDocument();
  });
});

describe('MemoryDetailContainer — not found', () => {
  it('shows an inline not-found + back link when the fetch yields nothing', () => {
    useApiData.mockReturnValue({ data: null, loading: false, error: null, refresh: vi.fn() });
    params = new URLSearchParams(); // no id
    render(<MemoryDetailContainer />);
    expect(screen.getByText('Memory not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /All memories/i })).toHaveAttribute('href', '/memory');
  });
});
