import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PendingApproval, Project, SessionDetail, Task } from '@midnite/shared';

afterEach(cleanup);

const decide = vi.fn();
let pending: PendingApproval[] = [];
vi.mock('@/hooks/use-approvals-socket', () => ({
  useApprovalsSocket: () => ({ pending, deciding: new Set<string>(), decide }),
}));

const listApprovalLog = vi.fn();
vi.mock('@/lib/api', () => ({
  listApprovalLog: (...a: unknown[]) => listApprovalLog(...a),
}));

import { SessionLeftPanel } from './session-left-panel';

const session = { id: 'sess-1', title: 'S', status: 'running' } as unknown as SessionDetail;
const task = {
  id: 't1',
  title: 'Fix bug',
  status: 'wip',
  priority: 2,
  retryCount: 1,
  createdAt: '2026-07-01T00:00:00Z',
} as unknown as Task;
const project = { id: 'p1', name: 'Web', workDir: '/repos/web' } as unknown as Project;

const pendingApproval = (over: Partial<PendingApproval>): PendingApproval => ({
  id: 'a1',
  sessionId: 'sess-1',
  taskId: 't1',
  toolName: 'Bash',
  summary: 'rm -rf build',
  cwd: '/repos/web',
  requestedAt: '2026-07-01T00:00:00Z',
  deadlineAt: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  pending = [];
  listApprovalLog.mockResolvedValue({ entries: [], total: 0, page: 1, limit: 25 });
});

describe('SessionLeftPanel', () => {
  it('queries the approval log scoped to this session', async () => {
    render(<SessionLeftPanel session={session} task={null} project={null} />);
    await waitFor(() =>
      expect(listApprovalLog).toHaveBeenCalledWith({ sessionId: 'sess-1', limit: 25 }),
    );
  });

  it('shows only this session’s live pending approvals and decides on click', async () => {
    pending = [pendingApproval({}), pendingApproval({ id: 'a2', sessionId: 'other', toolName: 'Write' })];
    render(<SessionLeftPanel session={session} task={null} project={null} />);

    expect(screen.getByText('Bash')).toBeInTheDocument();
    expect(screen.queryByText('Write')).not.toBeInTheDocument(); // other session filtered out

    fireEvent.click(screen.getByRole('button', { name: /Allow$/i }));
    expect(decide).toHaveBeenCalledWith('a1', 'sess-1', 'allow');
  });

  it('renders the decision history from the log', async () => {
    listApprovalLog.mockResolvedValue({
      entries: [
        {
          id: 'l1',
          sessionId: 'sess-1',
          taskId: 't1',
          toolName: 'Edit',
          summary: 'patch file',
          resolution: 'allow',
          ruleId: null,
          decidedBy: 'user',
          createdAt: '2026-07-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 25,
    });
    render(<SessionLeftPanel session={session} task={null} project={null} />);
    expect(await screen.findByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('allow')).toBeInTheDocument();
  });

  it('renders task + project context with links, and omits project when absent', async () => {
    const { rerender } = render(<SessionLeftPanel session={session} task={task} project={project} />);
    expect(screen.getByRole('link', { name: 'Fix bug' })).toHaveAttribute('href', '/tasks/view?id=t1');
    expect(screen.getByText('wip')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Web' })).toHaveAttribute('href', '/projects/p1');

    rerender(<SessionLeftPanel session={session} task={task} project={null} />);
    expect(screen.queryByText('Project')).not.toBeInTheDocument();
  });
});
