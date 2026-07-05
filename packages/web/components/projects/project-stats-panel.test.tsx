import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Project, Task } from '@midnite/shared';

const updateProject = vi.fn();
const deleteProject = vi.fn();
const exportProjectMarkdown = vi.fn();
vi.mock('@/lib/api', () => ({
  updateProject: (...a: unknown[]) => updateProject(...a),
  deleteProject: (...a: unknown[]) => deleteProject(...a),
  exportProjectMarkdown: (...a: unknown[]) => exportProjectMarkdown(...a),
}));

import { ProjectStatsPanel } from './project-stats-panel';
import { ConfirmProvider } from '@/components/confirm-dialog';
import { ToastProvider } from '@/components/toast';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  updateProject.mockResolvedValue(undefined);
});

const project: Project = {
  id: 'p1',
  name: 'Acme app',
  tag: 'acme',
  color: '#6366f1',
  sources: [],
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

const mk = (id: string, status: Task['status']): Task =>
  ({ id, title: id, status, priority: 1, retryCount: 0, fixAttempts: 0, tags: [], events: [] }) as Task;

function renderPanel(extra: Partial<Parameters<typeof ProjectStatsPanel>[0]> = {}) {
  const props = {
    project,
    tasks: [mk('a', 'todo'), mk('b', 'todo'), mk('c', 'done')],
    onSaved: vi.fn(),
    onDeleted: vi.fn(),
    ...extra,
  };
  render(
    <ToastProvider>
      <ConfirmProvider>
        <ProjectStatsPanel {...props} />
      </ConfirmProvider>
    </ToastProvider>,
  );
  return props;
}

it('shows total, done, and a per-status breakdown', () => {
  renderPanel();
  expect(screen.getByText('3')).toBeInTheDocument(); // total
  expect(screen.getByText(/1 done/)).toBeInTheDocument(); // done summary
  // Only non-zero statuses appear: 2 todo, 1 done (no backlog/wip/waiting rows).
  expect(screen.getByText('Todo')).toBeInTheDocument();
  expect(screen.getByText('Done')).toBeInTheDocument();
  expect(screen.queryByText('Backlog')).toBeNull();
});

it('archives via updateProject({archived:true}) and re-hydrates', async () => {
  const { onSaved } = renderPanel();
  fireEvent.click(screen.getByRole('button', { name: /Archive project/i }));
  await waitFor(() => expect(updateProject).toHaveBeenCalledWith('p1', { archived: true }));
  expect(onSaved).toHaveBeenCalled();
});

it('shows Unarchive for an archived project', () => {
  renderPanel({ project: { ...project, archived: true } });
  expect(screen.getByRole('button', { name: /Unarchive project/i })).toBeInTheDocument();
});
