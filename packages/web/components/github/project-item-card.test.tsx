import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { GithubProject, GithubProjectItem } from '@midnite/shared';

const getGithubProjects = vi.fn();
const getTaskProjectItem = vi.fn();
const linkTaskProjectItem = vi.fn();
const refreshTaskProjectItem = vi.fn();
const unlinkTaskProjectItem = vi.fn();

// `ApiError` is declared inside the factory: `vi.mock` hoists above the file's own
// statements, so a top-level class would still be in its TDZ when the factory runs. The
// card branches on `status` via `instanceof`, so a plain object would silently take the
// generic-error path and the 409/403 tests would pass for the wrong reason.
vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  }
  return {
    ApiError,
    getGithubProjects: (...a: unknown[]) => getGithubProjects(...a),
    getTaskProjectItem: (...a: unknown[]) => getTaskProjectItem(...a),
    linkTaskProjectItem: (...a: unknown[]) => linkTaskProjectItem(...a),
    refreshTaskProjectItem: (...a: unknown[]) => refreshTaskProjectItem(...a),
    unlinkTaskProjectItem: (...a: unknown[]) => unlinkTaskProjectItem(...a),
  };
});

import { ApiError } from '@/lib/api';
import { ProjectItemCard } from './project-item-card';
import { renderWithIntl as render } from '@/vitest.render-intl';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const PROJECTS: GithubProject[] = [
  { nodeId: 'PVT_1', number: 4, title: 'Roadmap', ownerLogin: 'acme', url: 'u', closed: false },
];

function linked(over: Partial<GithubProjectItem> = {}): GithubProjectItem {
  return {
    id: 'link-1',
    taskId: 'task-1',
    projectNodeId: 'PVT_1',
    itemNodeId: 'PVTI_1',
    projectTitle: 'Roadmap',
    projectUrl: 'https://github.com/orgs/acme/projects/4',
    statusFieldNodeId: 'PVTSSF_1',
    statusOptionName: 'In Progress',
    itemUrl: 'https://github.com/acme/api/issues/9',
    lastSyncedAt: '2026-08-22T10:00:00.000Z',
    mappings: [{ status: 'todo', optionId: 'o1', optionName: 'Todo' }],
    createdAt: '2026-08-22T09:00:00.000Z',
    updatedAt: '2026-08-22T10:00:00.000Z',
    ...over,
  };
}

/** `initialItem` seeds the card so these tests don't depend on its own fetch. */
function renderCard(item: GithubProjectItem | null) {
  render(<ProjectItemCard taskId="task-1" initialItem={item} />);
}

describe('ProjectItemCard — fetching its own link', () => {
  it('fetches the link when no initialItem is given', async () => {
    // The card owns every mutation on the link, so it owns the read too — that keeps
    // `TaskDetail` from having to thread this through.
    getTaskProjectItem.mockResolvedValue(linked());
    render(<ProjectItemCard taskId="task-1" />);
    expect(await screen.findByText('In “In Progress” on GitHub')).toBeTruthy();
  });

  it('treats a 404 as "not linked" rather than an error', async () => {
    getTaskProjectItem.mockRejectedValue(new ApiError('not linked', 404));
    render(<ProjectItemCard taskId="task-1" />);
    expect(await screen.findByText(/isn't on a GitHub Project board/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('ProjectItemCard — unlinked', () => {
  it('offers to link and fetches boards only when asked', async () => {
    // Discovery costs a GraphQL round-trip; a task that never links shouldn't pay it.
    renderCard(null);
    expect(getGithubProjects).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Link to a GitHub Project' }));
    await waitFor(() => expect(getGithubProjects).toHaveBeenCalled());
  });

  it('says a draft item will be created, so the write is not a surprise', async () => {
    getGithubProjects.mockResolvedValue(PROJECTS);
    renderCard(null);
    fireEvent.click(screen.getByRole('button', { name: 'Link to a GitHub Project' }));
    expect(await screen.findByText(/Creates a draft item on the board/)).toBeTruthy();
  });

  it('links the chosen board and reports the new item', async () => {
    getGithubProjects.mockResolvedValue(PROJECTS);
    linkTaskProjectItem.mockResolvedValue(linked());
    renderCard(null);

    fireEvent.click(screen.getByRole('button', { name: 'Link to a GitHub Project' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Link' }));

    await waitFor(() =>
      expect(linkTaskProjectItem).toHaveBeenCalledWith('task-1', { projectNodeId: 'PVT_1' }),
    );
    // The card switches to its linked state off its own returned value.
    expect(await screen.findByText('In “In Progress” on GitHub')).toBeTruthy();
  });

  it('prompts to connect — not an error — on the gateway\'s 409', async () => {
    getGithubProjects.mockRejectedValue(new ApiError('not connected', 409));
    renderCard(null);
    fireEvent.click(screen.getByRole('button', { name: 'Link to a GitHub Project' }));
    expect(await screen.findByText(/GitHub isn't connected/)).toBeTruthy();
  });

  it('says to reconnect for Projects access on a 403, not "no access"', async () => {
    // The token is valid; it just lacks `project`. Conflating the two sends people to the
    // wrong remedy.
    getGithubProjects.mockRejectedValue(new ApiError('scope', 403));
    renderCard(null);
    fireEvent.click(screen.getByRole('button', { name: 'Link to a GitHub Project' }));
    expect(await screen.findByText(/Reconnect to grant Projects access/)).toBeTruthy();
  });

  it('says so when the account has no boards', async () => {
    getGithubProjects.mockResolvedValue([]);
    renderCard(null);
    fireEvent.click(screen.getByRole('button', { name: 'Link to a GitHub Project' }));
    expect(await screen.findByText(/No Projects v2 boards found/)).toBeTruthy();
  });
});

describe('ProjectItemCard — linked', () => {
  it('shows the item\'s column as GitHub\'s, not midnite\'s', async () => {
    // The wording carries the direction of truth: read-back is display-only this phase.
    renderCard(linked());
    expect(screen.getByText('In “In Progress” on GitHub')).toBeTruthy();
  });

  it('links out to the item itself', () => {
    renderCard(linked());
    const link = screen.getByRole('link', { name: /Roadmap/ });
    expect(link.getAttribute('href')).toBe('https://github.com/acme/api/issues/9');
  });

  it('says when GitHub has no column set rather than showing nothing', () => {
    renderCard(linked({ statusOptionName: undefined }));
    expect(screen.getByText(/No column set on GitHub yet/)).toBeTruthy();
  });

  it('warns when no status is mapped, since pushes will be silent no-ops', () => {
    renderCard(linked({ mappings: [] }));
    expect(screen.getByText(/status changes won't move the item/)).toBeTruthy();
  });

  it('surfaces lastError instead of leaving a stale column unexplained', () => {
    // A silent stall is the failure mode the phase doc calls out.
    renderCard(linked({ lastError: 'rate limited' }));
    expect(screen.getByText(/Last sync failed: rate limited/)).toBeTruthy();
  });

  it('re-reads from GitHub on demand', async () => {
    refreshTaskProjectItem.mockResolvedValue(linked({ statusOptionName: 'Done' }));
    renderCard(linked());

    fireEvent.click(screen.getByRole('button', { name: 'Re-read from GitHub' }));
    expect(await screen.findByText('In “Done” on GitHub')).toBeTruthy();
  });

  it('confirms before unlinking and promises the item survives', async () => {
    unlinkTaskProjectItem.mockResolvedValue(undefined);
    renderCard(linked());

    fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
    expect(await screen.findByText(/The item stays on the board/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(unlinkTaskProjectItem).toHaveBeenCalledWith('task-1'));
    // Back to the empty state, off the card's own state.
    expect(await screen.findByText(/isn't on a GitHub Project board/)).toBeTruthy();
  });

  it('does not unlink when the confirmation is declined', async () => {
    renderCard(linked());
    fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(unlinkTaskProjectItem).not.toHaveBeenCalled());
  });
});
