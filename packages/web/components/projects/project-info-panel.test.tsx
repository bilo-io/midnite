import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Project, Task } from '@midnite/shared';
import { withQueryClient } from '@/lib/test-query-wrapper';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

// The panel now embeds a self-fetching cost card; stub its endpoints so these
// synchronous assertions run without a live gateway (the card stays pending).
vi.mock('@/lib/api', () => ({
  getUsageAttribution: vi.fn(() => new Promise(() => {})),
  getCycleTime: vi.fn(() => new Promise(() => {})),
}));

import { ProjectInfoPanel } from './project-info-panel';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const project: Project = {
  id: 'p1',
  name: 'Acme app',
  tag: 'acme',
  color: '#6366f1',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

const mk = (id: string, title: string, updatedAt: string): Task =>
  ({ id, title, status: 'wip', priority: 1, retryCount: 0, fixAttempts: 0, tags: [], events: [], updatedAt }) as Task;

it('lists recent tasks newest-first and fires onSelectTask on click', () => {
  const onSelectTask = vi.fn();
  const older = mk('t1', 'Older task', '2026-07-01T00:00:00Z');
  const newer = mk('t2', 'Newer task', '2026-07-04T00:00:00Z');
  render(withQueryClient(<ProjectInfoPanel project={project} tasks={[older, newer]} onSelectTask={onSelectTask} />));

  // Newest-first: the newer task's node precedes the older one in the DOM.
  const newerBtn = screen.getByText('Newer task');
  const olderBtn = screen.getByText('Older task');
  expect(newerBtn.compareDocumentPosition(olderBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(olderBtn);
  expect(onSelectTask).toHaveBeenCalledWith(older);
});

it('links to the project-scoped memory and shows an empty activity state', () => {
  render(withQueryClient(<ProjectInfoPanel project={project} tasks={[]} />));
  fireEvent.click(screen.getByText('Manage knowledge in Memory'));
  expect(push).toHaveBeenCalledWith('/memory?scope=p1');
  expect(screen.getByText('No task activity yet.')).toBeInTheDocument();
});
