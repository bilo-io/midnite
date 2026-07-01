import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Project, SessionDetail, Task } from '@midnite/shared';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

// The view is presentational; only the media-query hook needs stubbing so the
// desktop (rail) path renders deterministically.
vi.mock('@/hooks/use-media-query', () => ({ useIsMobile: () => false }));
// The left panel (Theme D) owns its own WS + fetch; stub it here so this stays a
// deterministic shell test (the panel has its own spec).
vi.mock('./session-left-panel', () => ({
  SessionLeftPanel: ({ task }: { task: { id: string; title: string } | null }) =>
    task ? <a href={`/tasks/view?id=${task.id}`}>{task.title}</a> : <div>left-panel</div>,
}));

import { SessionDetailView } from './session-detail-view';

const session: SessionDetail = {
  id: 's1',
  projectSlug: 'task',
  projectDisplay: 'midnite',
  title: 'Fix login flow',
  subtitle: 'the session subtitle',
  status: 'running',
  lastActivity: 0,
  linkedTaskId: 't1',
  createdAt: '2026-07-01T00:00:00Z',
  retryCount: 0,
  contextEstimate: true,
};

const task = { id: 't1', title: 'Fix login flow', projectId: 'p1' } as Task;
const project = { id: 'p1', name: 'Acme app' } as Project;

describe('SessionDetailView', () => {
  it('renders the session title, status, and the C/D/E placeholder regions', () => {
    render(<SessionDetailView session={session} task={task} project={project} />);
    expect(screen.getByRole('heading', { name: 'Fix login flow' })).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText(/Interactive terminal/)).toBeInTheDocument();
    expect(screen.getByText('Approvals & context')).toBeInTheDocument();
    expect(screen.getByText('Session info')).toBeInTheDocument();
  });

  it('shows the ended affordance for a completed session', () => {
    render(<SessionDetailView session={{ ...session, status: 'completed' }} task={null} project={null} />);
    expect(screen.getByText('ended')).toBeInTheDocument();
    expect(screen.getByText(/Read-only transcript/)).toBeInTheDocument();
  });

  it('mounts the left panel with the task (approvals + context live there)', () => {
    render(<SessionDetailView session={session} task={task} project={project} />);
    // Task/project links now render inside SessionLeftPanel (its own spec); the
    // shell just wires the task through to it.
    expect(screen.getByRole('link', { name: 'Fix login flow' })).toHaveAttribute('href', '/tasks/view?id=t1');
  });

  it('collapses a rail to a slim toggle and re-expands it (persisted state)', () => {
    render(<SessionDetailView session={session} task={task} project={project} />);
    expect(screen.getByText('Approvals & context')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Approvals & context' }));
    expect(screen.queryByText('Approvals & context')).toBeNull();
    // The collapsed rail leaves an expand affordance.
    fireEvent.click(screen.getByRole('button', { name: 'Expand Approvals & context' }));
    expect(screen.getByText('Approvals & context')).toBeInTheDocument();
  });
});
