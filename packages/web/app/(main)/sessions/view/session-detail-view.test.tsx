import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { Project, SessionDetail, Task } from '@midnite/shared';

import { ConfirmProvider } from '@/components/confirm-dialog';
import { ToastProvider } from '@/components/toast';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

// The view's session actions use `useToast` + `useConfirm`, which the app provides
// at the layout root (app/layout.tsx). Mirror that in the harness so the hooks
// resolve — same nested wrapper the slides-view spec uses.
const renderView = (ui: ReactElement) =>
  render(
    <ToastProvider>
      <ConfirmProvider>{ui}</ConfirmProvider>
    </ToastProvider>,
  );

// The view is presentational; only the media-query hook needs stubbing so the
// desktop (rail) path renders deterministically. The terminal region is its own
// unit (session-terminal-region.test.tsx) — stub it so this test stays about the
// cockpit shell (rails, header, links) and doesn't pull in the WS terminal / API.
vi.mock('@/hooks/use-media-query', () => ({ useIsMobile: () => false, useMediaQuery: () => false }));
// The terminal region (Theme C) is its own unit — stub it so this stays about the shell.
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
  it('renders the session title, the terminal region, and the D/E rail regions', () => {
    // Status now renders as a pill inside SessionInfoPanel (its own spec) — stubbed
    // here, so this shell test asserts the title, terminal wiring, and rails only.
    renderView(<SessionDetailView session={session} task={task} project={project} />);
    expect(screen.getByRole('heading', { name: 'Fix login flow' })).toBeInTheDocument();
    expect(screen.getByTestId('terminal-region')).toHaveTextContent('terminal:running');
    expect(screen.getByText('Approvals & context')).toBeInTheDocument();
    expect(screen.getByText('Session info')).toBeInTheDocument();
  });

  it('wires a completed session through to the terminal region', () => {
    // The status chip moved to SessionInfoPanel (covered by its spec); here we just
    // confirm the shell forwards a completed session's state to the terminal region.
    renderView(<SessionDetailView session={{ ...session, status: 'completed' }} task={null} project={null} />);
    expect(screen.getByTestId('terminal-region')).toHaveTextContent('terminal:completed');
  });

  it('mounts the left panel with the task (approvals + context live there)', () => {
    renderView(<SessionDetailView session={session} task={task} project={project} />);
    // Task/project links now render inside SessionLeftPanel (its own spec); the
    // shell just wires the task through to it.
    expect(screen.getByRole('link', { name: 'Fix login flow' })).toHaveAttribute('href', '/tasks/view?id=t1');
  });

  it('collapses and re-expands a rail via the content-layer toggle (persisted state)', () => {
    renderView(<SessionDetailView session={session} task={task} project={project} />);
    // The toggle is a content-layer control (not inside the rail); collapsing
    // flips its label and persists, while the rail animates its width to 0.
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Approvals & context' }));
    expect(screen.getByRole('button', { name: 'Expand Approvals & context' })).toBeInTheDocument();
    expect(localStorage.getItem('midnite.session.leftOpen')).toContain('false');
    fireEvent.click(screen.getByRole('button', { name: 'Expand Approvals & context' }));
    expect(screen.getByRole('button', { name: 'Collapse Approvals & context' })).toBeInTheDocument();
  });
});
