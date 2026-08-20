import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { GITHUB_NOT_CONNECTED_CODE, type Repo } from '@midnite/shared';

import { GithubController } from './github.controller';
import {
  GithubNotConnectedError,
  GithubRepoNotCheckedOutError,
  type GithubService,
} from './github.service';

const REPO: Repo = {
  id: 'r1',
  name: 'midnite',
  path: '~/Dev/midnite',
  ownerRepo: 'bilo-io/midnite',
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

function controller(over: Partial<GithubService>): GithubController {
  return new GithubController({
    getConnection: vi.fn(async () => ({ connected: false, scopes: [] })),
    listRepos: vi.fn(async () => ({ items: [], fetchedAt: '', cached: false, scannedRoots: [] })),
    importRepo: vi.fn(async () => REPO),
    ...over,
  } as unknown as GithubService);
}

describe('GithubController', () => {
  it('surfaces "not connected" as a 409 with a machine-readable code', async () => {
    // The client renders a connect prompt off this code — it must never have to
    // string-match the message.
    const c = controller({
      listRepos: vi.fn(async () => {
        throw new GithubNotConnectedError();
      }),
    });

    await expect(c.repos(undefined, null)).rejects.toMatchObject({
      status: 409,
      response: { code: GITHUB_NOT_CONNECTED_CODE },
    });
  });

  it('passes ?refresh=1 through as a cache bypass', async () => {
    const listRepos = vi.fn(async () => ({
      items: [],
      fetchedAt: '',
      cached: false,
      scannedRoots: [],
    }));
    const c = controller({ listRepos });

    await c.repos('1', { userId: 'u1' } as never);
    await c.repos(undefined, { userId: 'u1' } as never);

    expect(listRepos).toHaveBeenNthCalledWith(1, 'u1', { refresh: true });
    expect(listRepos).toHaveBeenNthCalledWith(2, 'u1', { refresh: false });
  });

  it('rejects an import body that is not an owner/repo slug', async () => {
    const c = controller({});
    await expect(c.import({ ownerRepo: 'not-a-slug' }, null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('translates a not-checked-out import to a 400, not a 500', async () => {
    const c = controller({
      importRepo: vi.fn(async () => {
        throw new GithubRepoNotCheckedOutError('bilo-io/ghost');
      }),
    });
    await expect(c.import({ ownerRepo: 'bilo-io/ghost' }, null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns the created registry row on a successful import', async () => {
    const c = controller({});
    await expect(c.import({ ownerRepo: 'bilo-io/midnite' }, { userId: 'u1' } as never)).resolves.toEqual(
      { repo: REPO },
    );
  });

  it('answers the connection route with 200 even when disconnected', async () => {
    const c = controller({});
    await expect(c.connection(null)).resolves.toEqual({
      connection: { connected: false, scopes: [] },
    });
  });

  it('does not mask an unexpected failure as a GitHub-specific status', async () => {
    const c = controller({
      listRepos: vi.fn(async () => {
        throw new Error('GitHub API rate limit exceeded');
      }),
    });
    const err = await c.repos(undefined, null).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(ConflictException);
  });
});
