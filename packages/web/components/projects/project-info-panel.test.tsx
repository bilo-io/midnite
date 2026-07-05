import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Project, Task } from '@midnite/shared';

// The Sources editor is its own unit (project-sources-panel.test.tsx) — stub it
// so this stays about the Activity list.
vi.mock('@/components/projects/panels/project-sources-panel', () => ({
  ProjectSourcesPanel: () => <div data-testid="sources-panel" />,
}));

import { ProjectInfoPanel } from './project-info-panel';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const project: Project = {
  id: 'p1',
  name: 'Acme app',
  tag: 'acme',
  color: '#6366f1',
  sources: [],
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

const mk = (id: string, title: string, updatedAt: string): Task =>
  ({ id, title, status: 'wip', priority: 1, retryCount: 0, fixAttempts: 0, tags: [], events: [], updatedAt }) as Task;

it('lists recent tasks newest-first and fires onSelectTask on click', () => {
  const onSelectTask = vi.fn();
  const older = mk('t1', 'Older task', '2026-07-01T00:00:00Z');
  const newer = mk('t2', 'Newer task', '2026-07-04T00:00:00Z');
  render(<ProjectInfoPanel project={project} tasks={[older, newer]} onChange={vi.fn()} onSelectTask={onSelectTask} />);

  const items = screen.getAllByRole('button');
  // Newest first.
  expect(items[0]).toHaveTextContent('Newer task');
  fireEvent.click(screen.getByText('Older task'));
  expect(onSelectTask).toHaveBeenCalledWith(older);
});

it('shows an empty activity state and still renders sources', () => {
  render(<ProjectInfoPanel project={project} tasks={[]} onChange={vi.fn()} />);
  expect(screen.getByTestId('sources-panel')).toBeInTheDocument();
  expect(screen.getByText('No task activity yet.')).toBeInTheDocument();
});
