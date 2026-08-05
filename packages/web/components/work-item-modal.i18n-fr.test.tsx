import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import type { SessionSummary } from '@midnite/shared';

import { renderWithIntl } from '@/vitest.render-intl';

/**
 * Phase 82 Theme D/F close-out (unified work-item modal) — behavioural fr-FR renders.
 *
 * The cases target the **session-only shell** (a session with no linked task), which is
 * the branch that carries the modal's own copy — the task-backed branch delegates every
 * string to `TaskDetail`. All of it is invisible to the `jsx-text-only` lint gate:
 *
 * - the dialog's **`aria-label`**, which falls back to `plan.workItem.fallbackTitle`
 *   when neither side supplies a title
 * - the archive/unarchive **`HoverExpandButton` label** (a prop, not JSX text) chosen
 *   by a conditional
 * - the "Open page" label + the close **`aria-label`**, both reused from `task.*` so the
 *   shell and `TaskDetail`'s tab strip can't drift
 */

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/lib/api', () => ({
  gatewayUrl: () => 'http://gw',
  // The modal resolves the counterpart task on mount; there is none here.
  getTask: vi.fn().mockRejectedValue(new Error('no task')),
  getSession: vi.fn().mockRejectedValue(new Error('no session')),
  getTasks: vi.fn().mockResolvedValue([]),
  // SessionPane self-fetches the transcript for a non-live session.
  getSessionTranscript: vi.fn().mockResolvedValue({ messages: [], taskEvents: [] }),
}));

import { WorkItemModal } from './work-item-modal';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function session(over: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: 's1',
    title: '',
    status: 'idle',
    projectDisplay: 'acme/web',
    ...over,
  } as SessionSummary;
}

describe('WorkItemModal — fr-FR (session-only shell)', () => {
  it('falls back to the translated work-item title and translates the chrome', async () => {
    renderWithIntl(
      <WorkItemModal
        origin={{ kind: 'session', session: session() }}
        projects={[]}
        onClose={vi.fn()}
        onArchiveToggle={vi.fn()}
      />,
      { locale: 'fr-FR' },
    );

    // A titleless session (`title: ''`, the schema has no nullable) → the fallback.
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Élément de travail' })).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Fermer')).toBeInTheDocument();
    // `task.openPage` — the same key TaskDetail's tab strip renders.
    expect(screen.getByText('Ouvrir la page')).toBeInTheDocument();
    // The uppercase badge reuses `task.tabs.session`.
    expect(screen.getByText('Session')).toBeInTheDocument();
  });

  it('translates the archive action, and flips it for an archived session', async () => {
    const { unmount } = renderWithIntl(
      <WorkItemModal
        origin={{ kind: 'session', session: session({ title: 'Ma session' }) }}
        projects={[]}
        onClose={vi.fn()}
        onArchiveToggle={vi.fn()}
      />,
      { locale: 'fr-FR' },
    );

    await waitFor(() => expect(screen.getByText('Archiver')).toBeInTheDocument());
    unmount();

    renderWithIntl(
      <WorkItemModal
        origin={{
          kind: 'session',
          session: session({ title: 'Ma session', archivedAt: '2026-01-01T00:00:00.000Z' }),
        }}
        projects={[]}
        onClose={vi.fn()}
        onArchiveToggle={vi.fn()}
      />,
      { locale: 'fr-FR' },
    );

    await waitFor(() => expect(screen.getByText('Désarchiver')).toBeInTheDocument());
  });
});
