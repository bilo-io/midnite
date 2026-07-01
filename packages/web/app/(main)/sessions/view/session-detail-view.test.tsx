import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Project, SessionDetail, Task } from '@midnite/shared';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

// The view is presentational; only the media-query hook needs stubbing so the
// desktop (rail) path renders deterministically. The terminal region is its own
// unit (session-terminal-region.test.tsx) — stub it so this test stays about the
// cockpit shell (rails, header, links) and doesn't pull in the WS terminal / API.
vi.mock('@/hooks/use-media-query', () => ({ useIsMobile: () => false }));
vi.mock('@/components/session-terminal-region', () => ({
  SessionTerminalRegion: ({ session }: { session: { status: string } }) => (
    <div data-testid="terminal-region">terminal:{session.status}</div>
  ),
}));
// The right-rail readout is its own unit (session-info-panel.test.tsx) — stub it
// so its Status/etc. rows don't collide with the header's status chip here.
vi.mock('@/components/session-info-panel', () => ({
  SessionInfoPanel: () => <div data-testid="info-panel">info panel</div>,
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
  it('renders the session title, status, the terminal region, and the D/E rail regions', () => {
    render(<SessionDetailView session={session} task={task} project={project} />);
    expect(screen.getByRole('heading', { name: 'Fix login flow' })).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-region')).toHaveTextContent('terminal:running');
    expect(screen.getByText('Approvals & context')).toBeInTheDocument();
    expect(screen.getByText('Session info')).toBeInTheDocument();
  });

  it('shows the ended status chip for a completed session', () => {
    render(<SessionDetailView session={{ ...session, status: 'completed' }} task={null} project={null} />);
    expect(screen.getByText('ended')).toBeInTheDocument();
  });

  it('links the task and project when present', () => {
    render(<SessionDetailView session={session} task={task} project={project} />);
    expect(screen.getByRole('link', { name: 'Fix login flow' })).toHaveAttribute('href', '/tasks/view?id=t1');
    expect(screen.getByText('Project: Acme app')).toBeInTheDocument();
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
