import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { GithubRepo, GithubReposResponse, Repo } from '@midnite/shared';

const getGithubRepos = vi.fn();
const importGithubRepo = vi.fn();

// `ApiError` is part of the mock because the dialog branches on `status === 409` via an
// `instanceof` check — a plain object would silently fall into the generic error path and
// the not-connected test would pass for the wrong reason. It is declared *inside* the
// factory: `vi.mock` is hoisted above the file's own statements, so a top-level `class`
// would still be in its TDZ when the factory runs.
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
    getGithubRepos: (...a: unknown[]) => getGithubRepos(...a),
    importGithubRepo: (...a: unknown[]) => importGithubRepo(...a),
  };
});

import { ApiError } from '@/lib/api';
import { RepoBrowserDialog } from './repo-browser-dialog';
import { renderWithIntl as render } from '@/vitest.render-intl';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function ghRepo(over: Partial<GithubRepo> & { ownerRepo: string }): GithubRepo {
  const [owner, name] = over.ownerRepo.split('/');
  return {
    id: 1,
    name: name!,
    owner: owner!,
    private: false,
    fork: false,
    archived: false,
    defaultBranch: 'main',
    htmlUrl: `https://github.com/${over.ownerRepo}`,
    checkoutState: 'not-checked-out',
    ...over,
  };
}

function response(items: GithubRepo[], scannedRoots = ['~/Dev']): GithubReposResponse {
  return { items, fetchedAt: '2026-08-20T00:00:00.000Z', cached: false, scannedRoots };
}

const REGISTRY_ROW: Repo = {
  id: 'r-new',
  name: 'scratch',
  path: '~/Dev/scratch',
  ownerRepo: 'bilo-io/scratch',
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

const THREE_STATES = [
  ghRepo({ id: 1, ownerRepo: 'bilo-io/midnite', checkoutState: 'registered', registeredRepoId: 'r1', localPath: '~/Dev/midnite' }),
  ghRepo({ id: 2, ownerRepo: 'bilo-io/scratch', checkoutState: 'on-disk', localPath: '~/Dev/scratch' }),
  ghRepo({ id: 3, ownerRepo: 'bilo-io/never-cloned' }),
];

function renderDialog(over: Partial<Parameters<typeof RepoBrowserDialog>[0]> = {}) {
  const onClose = vi.fn();
  const onImported = vi.fn();
  const onPrefill = vi.fn();
  const element = (open: boolean) => (
    <RepoBrowserDialog
      open={open}
      onClose={onClose}
      onImported={onImported}
      onPrefill={onPrefill}
      {...over}
    />
  );
  const { rerender } = render(element(over.open ?? true));
  // `setOpen` keeps the component instance (and therefore its request-sequence ref)
  // alive across a close/reopen, which is the cycle the stale-response guard is for.
  return { onClose, onImported, onPrefill, setOpen: (open: boolean) => rerender(element(open)) };
}

describe('RepoBrowserDialog', () => {
  it('labels each of the three checkout states distinguishably', async () => {
    getGithubRepos.mockResolvedValue(response(THREE_STATES));
    renderDialog();

    expect(await screen.findByText('Already registered')).toBeTruthy();
    expect(screen.getByText('On disk at ~/Dev/scratch')).toBeTruthy();
    expect(screen.getByText('Not checked out locally')).toBeTruthy();
  });

  it('offers a one-click import for an on-disk repo and no action for a registered one', async () => {
    getGithubRepos.mockResolvedValue(response(THREE_STATES));
    renderDialog();

    await screen.findByText('Already registered');
    expect(screen.getByRole('button', { name: 'Added' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Import' })).toHaveProperty('disabled', false);
  });

  it('imports an on-disk repo with no typing and reports the created row', async () => {
    getGithubRepos.mockResolvedValue(response(THREE_STATES));
    importGithubRepo.mockResolvedValue(REGISTRY_ROW);
    const { onImported } = renderDialog();

    fireEvent.click(await screen.findByRole('button', { name: 'Import' }));

    // The slug alone — the gateway infers name and path from the matched checkout.
    await waitFor(() => expect(importGithubRepo).toHaveBeenCalledWith({ ownerRepo: 'bilo-io/scratch' }));
    expect(onImported).toHaveBeenCalledWith(REGISTRY_ROW);
    // The row flips to "registered" in place rather than needing a refetch.
    expect(await screen.findAllByRole('button', { name: 'Added' })).toHaveLength(2);
  });

  it('hands an un-cloned repo to the create form instead of importing a pathless row', async () => {
    getGithubRepos.mockResolvedValue(response(THREE_STATES));
    const { onPrefill, onClose } = renderDialog();

    fireEvent.click(await screen.findByRole('button', { name: 'Add manually' }));

    expect(onPrefill).toHaveBeenCalledWith({ name: 'never-cloned', ownerRepo: 'bilo-io/never-cloned' });
    expect(importGithubRepo).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders a connect prompt — not an error — on the gateway\'s 409', async () => {
    getGithubRepos.mockRejectedValue(new ApiError('not connected', 409));
    renderDialog();

    expect(await screen.findByText('GitHub is not connected')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('surfaces any other failure as an error, not as a connect prompt', async () => {
    getGithubRepos.mockRejectedValue(new ApiError('GitHub API rate limit exceeded', 403));
    renderDialog();

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'GitHub API rate limit exceeded',
    );
    expect(screen.queryByText('GitHub is not connected')).toBeNull();
  });

  it('filters by search text across name and description', async () => {
    getGithubRepos.mockResolvedValue(
      response([
        ghRepo({ id: 1, ownerRepo: 'bilo-io/midnite' }),
        ghRepo({ id: 2, ownerRepo: 'bilo-io/other', description: 'a midnite satellite' }),
        ghRepo({ id: 3, ownerRepo: 'bilo-io/unrelated' }),
      ]),
    );
    renderDialog();

    fireEvent.change(await screen.findByLabelText('Search repositories'), {
      target: { value: 'midnite' },
    });

    expect(screen.getByText('bilo-io/midnite')).toBeTruthy();
    expect(screen.getByText('bilo-io/other')).toBeTruthy();
    expect(screen.queryByText('bilo-io/unrelated')).toBeNull();
  });

  it('offers an owner filter only when more than one owner is present', async () => {
    getGithubRepos.mockResolvedValue(
      response([ghRepo({ id: 1, ownerRepo: 'bilo-io/a' }), ghRepo({ id: 2, ownerRepo: 'acme/b' })]),
    );
    renderDialog();

    const select = await screen.findByLabelText('Filter by owner');
    fireEvent.change(select, { target: { value: 'acme' } });

    expect(screen.getByText('acme/b')).toBeTruthy();
    expect(screen.queryByText('bilo-io/a')).toBeNull();
  });

  it('hides the owner filter for a single-owner account', async () => {
    getGithubRepos.mockResolvedValue(response([ghRepo({ id: 1, ownerRepo: 'bilo-io/a' })]));
    renderDialog();

    await screen.findByText('bilo-io/a');
    expect(screen.queryByLabelText('Filter by owner')).toBeNull();
  });

  it('bypasses the cache on refresh', async () => {
    getGithubRepos.mockResolvedValue(response([ghRepo({ id: 1, ownerRepo: 'bilo-io/a' })]));
    renderDialog();

    await screen.findByText('bilo-io/a');
    expect(getGithubRepos).toHaveBeenCalledWith({ refresh: false });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh from GitHub' }));
    await waitFor(() => expect(getGithubRepos).toHaveBeenCalledWith({ refresh: true }));
  });

  it('ignores a stale response when a newer request is in flight', async () => {
    // Close-then-reopen leaves two fetches running against one component instance;
    // without a sequence guard the slower (older) one lands last and overwrites the
    // newer list.
    let releaseFirst: (v: GithubReposResponse) => void = () => {};
    getGithubRepos
      .mockImplementationOnce(
        () => new Promise<GithubReposResponse>((resolve) => (releaseFirst = resolve)),
      )
      .mockResolvedValue(response([ghRepo({ id: 2, ownerRepo: 'bilo-io/fresh' })]));

    const { setOpen } = renderDialog();
    await waitFor(() => expect(getGithubRepos).toHaveBeenCalledTimes(1));
    setOpen(false);
    setOpen(true);
    expect(await screen.findByText('bilo-io/fresh')).toBeTruthy();

    // The first request finally resolves — with the list that is now out of date.
    releaseFirst(response([ghRepo({ id: 1, ownerRepo: 'bilo-io/stale' })]));

    await waitFor(() => expect(screen.getByText('bilo-io/fresh')).toBeTruthy());
    expect(screen.queryByText('bilo-io/stale')).toBeNull();
  });

  it('explains an empty match set by naming the folders it scanned', async () => {
    getGithubRepos.mockResolvedValue(response([ghRepo({ id: 1, ownerRepo: 'bilo-io/a' })], ['~/Dev', '~/work']));
    renderDialog();
    expect(await screen.findByText('Scanned for checkouts in ~/Dev, ~/work')).toBeTruthy();
  });

  it('says so when there are no folders to scan at all', async () => {
    getGithubRepos.mockResolvedValue(response([ghRepo({ id: 1, ownerRepo: 'bilo-io/a' })], []));
    renderDialog();
    expect(await screen.findByText(/No checkout folders to scan/)).toBeTruthy();
  });

  it('fetches nothing while closed', () => {
    renderDialog({ open: false });
    expect(getGithubRepos).not.toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    getGithubRepos.mockResolvedValue(response([ghRepo({ id: 1, ownerRepo: 'bilo-io/a' })]));
    const { onClose } = renderDialog();

    await screen.findByText('bilo-io/a');
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('marks a private repo accessibly rather than by colour alone', async () => {
    getGithubRepos.mockResolvedValue(
      response([ghRepo({ id: 1, ownerRepo: 'bilo-io/secret', private: true })]),
    );
    renderDialog();
    expect(await screen.findByLabelText('Private repository')).toBeTruthy();
  });
});
