import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithIntl as render } from '@/vitest.render-intl';
import type { Project } from '@midnite/shared';

const getProjects = vi.fn();
vi.mock('@/lib/api', () => ({ getProjects: () => getProjects() }));

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
});
