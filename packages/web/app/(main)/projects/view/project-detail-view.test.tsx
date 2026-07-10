import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Memory, Project, Task } from '@midnite/shared';

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  params = new URLSearchParams();
});

// Desktop path so the rails (not drawers) render deterministically.
vi.mock('@/hooks/use-media-query', () => ({ useIsMobile: () => false }));

let params = new URLSearchParams();
const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => params,
}));

// The center + rail panels are their own units — stub them so this stays a
// deterministic shell test (tabs, rail collapse, header).
vi.mock('@/components/projects/panels/project-details-panel', () => ({
  ProjectDetailsPanel: () => <div data-testid="details-panel" />,
}));
vi.mock('@/components/projects/panels/project-plan-panel', () => ({
  ProjectPlanPanel: () => <div data-testid="plan-panel" />,
}));
vi.mock('@/components/projects/panels/project-tasks-panel', () => ({
  ProjectTasksPanel: () => <div data-testid="tasks-panel" />,
}));
vi.mock('@/components/projects/panels/project-phasedocs-panel', () => ({
  ProjectPhaseDocsPanel: () => <div data-testid="phasedocs-panel" />,
}));
vi.mock('@/components/projects/project-stats-panel', () => ({
  ProjectStatsPanel: () => <div data-testid="stats-panel" />,
}));
vi.mock('@/components/projects/project-info-panel', () => ({
  ProjectInfoPanel: () => <div data-testid="info-panel" />,
}));

// Not-found: drive the container via the api-data hook without a real query client.
const useApiData = vi.fn();
vi.mock('@/lib/use-api-data', () => ({ useApiData: (...a: unknown[]) => useApiData(...a) }));

import { ProjectDetailView, ProjectDetailContainer } from './project-detail-view';

const project: Project = {
  id: 'p1',
  name: 'Acme app',
  tag: 'acme',
  color: '#6366f1',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};
const tasks: Task[] = [];
const memories: Memory[] = [];

describe('ProjectDetailView — shell', () => {
  it('renders the header, the four center tabs, and both rail regions', () => {
    render(<ProjectDetailView project={project} tasks={tasks} memories={memories} onChanged={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Acme app' })).toBeInTheDocument();
    for (const label of ['Details', 'Plan', 'Tasks', 'Phase docs']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText('Stats & actions')).toBeInTheDocument();
    expect(screen.getByText('Knowledge & activity')).toBeInTheDocument();
    // Defaults to the Details tab.
    expect(screen.getByTestId('details-panel')).toBeInTheDocument();
  });

  it('honours ?tab= for the active center panel', () => {
    params = new URLSearchParams('tab=tasks');
    render(<ProjectDetailView project={project} tasks={tasks} memories={memories} onChanged={vi.fn()} />);
    expect(screen.getByTestId('tasks-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('details-panel')).toBeNull();
  });

  it('writes ?tab= on tab change', () => {
    render(<ProjectDetailView project={project} tasks={tasks} memories={memories} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Plan' }));
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('tab=plan'));
  });

  it('collapses a rail to a slim toggle and re-expands it (persisted)', () => {
    render(<ProjectDetailView project={project} tasks={tasks} memories={memories} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Stats & actions' }));
    expect(screen.queryByText('Stats & actions')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Stats & actions' }));
    expect(screen.getByText('Stats & actions')).toBeInTheDocument();
  });
});

describe('ProjectDetailContainer — not found', () => {
  it('shows an inline not-found + back link when the fetch yields nothing', () => {
    useApiData.mockReturnValue({ data: null, loading: false, error: null, refresh: vi.fn() });
    params = new URLSearchParams(); // no id
    render(<ProjectDetailContainer />);
    expect(screen.getByText('Project not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /All projects/i })).toHaveAttribute('href', '/projects');
  });
});
