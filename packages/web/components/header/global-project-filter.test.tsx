import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithIntl as render } from '@/vitest.render-intl';
import type { Project } from '@midnite/shared';

const getProjects = vi.fn();
vi.mock('@/lib/api', () => ({ getProjects: () => getProjects() }));

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { GlobalProjectFilter } from './global-project-filter';
import { useProjectFilterStore } from '@/lib/project-filter-store';

const project = (over: Partial<Project> = {}): Project =>
  ({
    id: 'p1',
    name: 'Acme',
    tag: 'ACME',
    color: '#3b82f6',
    ...over,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double: only id/name/tag/color are read
  }) as any;

function renderFilter() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <GlobalProjectFilter />
    </QueryClientProvider>,
  );
}

afterEach(cleanup);
beforeEach(() => {
  getProjects.mockReset();
  push.mockReset();
  useProjectFilterStore.setState({ selected: [] });
});

describe('GlobalProjectFilter', () => {
  it('renders nothing while there are no projects', async () => {
    getProjects.mockResolvedValue([]);
    renderFilter();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('button', { name: /filter by project/i })).toBeNull();
  });

  it('shows "All projects" until a selection is made', async () => {
    getProjects.mockResolvedValue([project()]);
    renderFilter();
    expect(await screen.findByText('All projects')).toBeInTheDocument();
  });

  it('opens a listbox with an Unassigned option plus every project', async () => {
    getProjects.mockResolvedValue([project(), project({ id: 'p2', tag: 'BETA' })]);
    renderFilter();
    fireEvent.click(await screen.findByRole('button', { name: /filter by project/i }));
    expect(screen.getByRole('option', { name: /unassigned/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ACME' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'BETA' })).toBeInTheDocument();
  });

  it('selecting a project renders it as a pill tag in the trigger and updates the store', async () => {
    getProjects.mockResolvedValue([project()]);
    renderFilter();
    fireEvent.click(await screen.findByRole('button', { name: /filter by project/i }));
    fireEvent.click(screen.getByRole('option', { name: 'ACME' }));
    // Multi-select stays open after a pick; close it to inspect the trigger alone.
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(useProjectFilterStore.getState().selected).toEqual(['p1']);
    // The trigger now renders the selection as a ProjectTag pill, not "All projects".
    expect(screen.queryByText('All projects')).toBeNull();
    expect(screen.getByText('ACME')).toBeInTheDocument();
  });

  it('"All projects" clears the selection', async () => {
    getProjects.mockResolvedValue([project()]);
    useProjectFilterStore.setState({ selected: ['p1'] });
    renderFilter();
    fireEvent.click(await screen.findByRole('button', { name: /filter by project/i }));
    fireEvent.click(screen.getByRole('option', { name: /all projects/i }));

    expect(useProjectFilterStore.getState().selected).toEqual([]);
  });

  it('sorts real projects A→Z with Unassigned pinned above them', async () => {
    getProjects.mockResolvedValue([project({ id: 'p2', tag: 'ZEBRA' }), project({ tag: 'ALPHA' })]);
    renderFilter();
    fireEvent.click(await screen.findByRole('button', { name: /filter by project/i }));
    const tags = screen.getAllByRole('option').map((o) => o.textContent);
    // "All projects" (reset) first, then pinned Unassigned, then A→Z.
    expect(tags[0]).toMatch(/all projects/i);
    expect(tags[1]).toMatch(/unassigned/i);
    expect(tags[2]).toBe('ALPHA');
    expect(tags[3]).toBe('ZEBRA');
  });

  it('filters the list by the search box', async () => {
    getProjects.mockResolvedValue([project({ tag: 'ALPHA' }), project({ id: 'p2', tag: 'ZEBRA' })]);
    renderFilter();
    fireEvent.click(await screen.findByRole('button', { name: /filter by project/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /search projects/i }), {
      target: { value: 'zeb' },
    });
    expect(screen.queryByRole('option', { name: 'ALPHA' })).toBeNull();
    expect(screen.getByRole('option', { name: 'ZEBRA' })).toBeInTheDocument();
    // The "All projects" reset row stays available regardless of the query.
    expect(screen.getByRole('option', { name: /all projects/i })).toBeInTheDocument();
  });

  it('"New project" routes to the projects page create flow', async () => {
    getProjects.mockResolvedValue([project()]);
    renderFilter();
    fireEvent.click(await screen.findByRole('button', { name: /filter by project/i }));
    fireEvent.click(screen.getByRole('button', { name: /new project/i }));
    expect(push).toHaveBeenCalledWith('/projects?new=1');
  });
});
