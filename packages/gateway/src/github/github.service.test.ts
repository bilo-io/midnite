import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateRepoRequest, MidniteConfig, Repo } from '@midnite/shared';

import type { ReposService } from '../repos/repos.service';
import { GithubNotConnectedError, GithubRepoNotCheckedOutError, GithubService } from './github.service';
import type { GithubTokenService } from './github-token.service';

// A faked `fetch` plus real temp directories: the annotation logic is a join between a
// remote list, a local scan, and the registry, so two of the three are kept real.

let home: string;
let devRoot: string;

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'midnite-home-'));
  devRoot = join(home, 'Dev');
  await mkdir(devRoot, { recursive: true });
});

afterEach(async () => {
  await rm(home, { recursive: true, force: true });
  vi.useRealTimers();
});

async function makeCheckout(name: string, ownerRepo: string): Promise<string> {
  const dir = join(devRoot, name);
  await mkdir(join(dir, '.git'), { recursive: true });
  await writeFile(
    join(dir, '.git', 'config'),
    `[remote "origin"]\n\turl = git@github.com:${ownerRepo}.git\n`,
  );
  return dir;
}

function restRepo(overrides: Partial<Record<string, unknown>> & { full_name: string }) {
  const [owner, name] = overrides.full_name.split('/');
  return {
    id: 1,
    name,
    private: false,
    fork: false,
    archived: false,
    default_branch: 'main',
    description: null,
    html_url: `https://github.com/${overrides.full_name}`,
    pushed_at: '2026-08-19T12:00:00Z',
    owner: { login: owner },
    ...overrides,
  };
}

/** A `fetch` that answers `/user/repos` with one page and `/user` with a profile. */
function fakeFetch(pages: unknown[][], scopes = 'repo, project, read:org') {
  return vi.fn(async (url: string | URL | Request) => {
    const href = String(url);
    if (href.includes('/user/repos')) {
      const page = Number(new URL(href).searchParams.get('page') ?? '1');
      const body = pages[page - 1] ?? [];
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (href.endsWith('/user')) {
      return new Response(JSON.stringify({ login: 'octo', avatar_url: 'https://a/i.png' }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-oauth-scopes': scopes },
      });
    }
    throw new Error(`unexpected fetch: ${href}`);
  }) as unknown as typeof fetch;
}

function fakeTokens(token: string | null): GithubTokenService {
  return {
    resolve: vi.fn(async () => (token === null ? null : { token, source: 'pat' as const })),
  } as unknown as GithubTokenService;
}

function fakeRepos(
  rows: Repo[],
): ReposService & { created: CreateRepoRequest[]; scopes: unknown[] } {
  const created: CreateRepoRequest[] = [];
  const scopes: unknown[] = [];
  const svc = {
    created,
    scopes,
    list: vi.fn((scope?: unknown) => {
      scopes.push(scope);
      return rows;
    }),
    create: vi.fn((req: CreateRepoRequest) => {
      created.push(req);
      const row: Repo = {
        id: `repo-${rows.length + 1}`,
        name: req.name,
        path: req.path,
        ownerRepo: req.ownerRepo,
        createdAt: '2026-08-20T00:00:00.000Z',
        updatedAt: '2026-08-20T00:00:00.000Z',
      };
      rows.push(row);
      return row;
    }),
  };
  return svc as unknown as ReposService & { created: CreateRepoRequest[]; scopes: unknown[] };
}

const SCOPE = { userId: 'user-1', teamId: 'team-1' };
const OTHER_SCOPE = { userId: 'user-2', teamId: 'team-2' };

function config(checkoutRoots: string[] = []): MidniteConfig {
  return { github: { checkoutRoots } } as MidniteConfig;
}

function registryRow(over: Partial<Repo> & { name: string; path: string }): Repo {
  return {
    id: `id-${over.name}`,
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
    ...over,
  } as Repo;
}

describe('GithubService.listRepos', () => {
  it('labels the three checkout states', async () => {
    await makeCheckout('midnite', 'bilo-io/midnite');
    await makeCheckout('scratch', 'bilo-io/scratch');
    const repos = fakeRepos([
      registryRow({ name: 'midnite', path: '~/Dev/midnite', ownerRepo: 'bilo-io/midnite' }),
    ]);
    const service = new GithubService(
      fakeTokens('t'),
      repos,
      config([devRoot]),
      { fetchImpl: fakeFetch([[
        restRepo({ id: 1, full_name: 'bilo-io/midnite' }),
        restRepo({ id: 2, full_name: 'bilo-io/scratch' }),
        restRepo({ id: 3, full_name: 'bilo-io/never-cloned' }),
      ]]) },
      home,
    );

    const { items } = await service.listRepos(SCOPE);

    expect(items.map((r) => [r.ownerRepo, r.checkoutState])).toEqual([
      ['bilo-io/midnite', 'registered'],
      ['bilo-io/scratch', 'on-disk'],
      ['bilo-io/never-cloned', 'not-checked-out'],
    ]);
    expect(items[0]!.registeredRepoId).toBe('id-midnite');
    // The registered row's own recorded path is the truth about where it lives.
    expect(items[0]!.localPath).toBe('~/Dev/midnite');
    // An unregistered match is reported in `~`-form, ready to prefill the create form.
    expect(items[1]!.localPath).toBe('~/Dev/scratch');
    expect(items[2]!.localPath).toBeUndefined();
  });

  it('matches case-insensitively across the remote, the registry and GitHub', async () => {
    await makeCheckout('app', 'Bilo-IO/App');
    const service = new GithubService(
      fakeTokens('t'),
      fakeRepos([]),
      config([devRoot]),
      { fetchImpl: fakeFetch([[restRepo({ id: 1, full_name: 'bilo-io/app' })]]) },
      home,
    );
    const { items } = await service.listRepos();
    expect(items[0]!.checkoutState).toBe('on-disk');
  });

  it('ignores a registry row with no ownerRepo — nothing links it to GitHub', async () => {
    const service = new GithubService(
      fakeTokens('t'),
      fakeRepos([registryRow({ name: 'midnite', path: '~/Dev/midnite' })]),
      config([devRoot]),
      { fetchImpl: fakeFetch([[restRepo({ id: 1, full_name: 'bilo-io/midnite' })]]) },
      home,
    );
    const { items } = await service.listRepos();
    expect(items[0]!.checkoutState).toBe('not-checked-out');
    expect(items[0]!.registeredRepoId).toBeUndefined();
  });

  it('follows pagination to the end', async () => {
    const full = Array.from({ length: 100 }, (_, i) =>
      restRepo({ id: i + 1, full_name: `bilo-io/repo-${i + 1}` }),
    );
    const fetchImpl = fakeFetch([full, [restRepo({ id: 101, full_name: 'bilo-io/last' })]]);
    const service = new GithubService(
      fakeTokens('t'),
      fakeRepos([]),
      config([devRoot]),
      { fetchImpl },
      home,
    );

    const { items } = await service.listRepos();

    expect(items).toHaveLength(101);
    expect(items.at(-1)!.ownerRepo).toBe('bilo-io/last');
    // Two repo pages, and it stops on the short one rather than paging forever.
    expect(vi.mocked(fetchImpl).mock.calls.filter(([u]) => String(u).includes('/user/repos'))).toHaveLength(2);
  });

  it('serves a second call from the cache, and re-fetches on refresh', async () => {
    const fetchImpl = fakeFetch([[restRepo({ id: 1, full_name: 'bilo-io/app' })]]);
    const service = new GithubService(
      fakeTokens('t'),
      fakeRepos([]),
      config([devRoot]),
      { fetchImpl },
      home,
    );

    const first = await service.listRepos(SCOPE);
    const second = await service.listRepos(SCOPE);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.fetchedAt).toBe(first.fetchedAt);
    expect(repoCalls(fetchImpl)).toBe(1);

    const refreshed = await service.listRepos(SCOPE, { refresh: true });
    expect(refreshed.cached).toBe(false);
    expect(repoCalls(fetchImpl)).toBe(2);
  });

  it('re-scans checkouts on a cache hit, so cloning a repo is reflected immediately', async () => {
    // The GitHub list is cached; the local scan deliberately is not. A stale annotation
    // would be the bug the cache introduced.
    const fetchImpl = fakeFetch([[restRepo({ id: 1, full_name: 'bilo-io/app' })]]);
    const service = new GithubService(
      fakeTokens('t'),
      fakeRepos([]),
      config([devRoot]),
      { fetchImpl },
      home,
    );

    expect((await service.listRepos(SCOPE)).items[0]!.checkoutState).toBe('not-checked-out');
    await makeCheckout('app', 'bilo-io/app');
    const second = await service.listRepos(SCOPE);

    expect(second.cached).toBe(true);
    expect(second.items[0]!.checkoutState).toBe('on-disk');
    expect(repoCalls(fetchImpl)).toBe(1);
  });

  it('expires the cache after the TTL', async () => {
    vi.useFakeTimers();
    const fetchImpl = fakeFetch([[restRepo({ id: 1, full_name: 'bilo-io/app' })]]);
    const service = new GithubService(
      fakeTokens('t'),
      fakeRepos([]),
      config([devRoot]),
      { fetchImpl },
      home,
    );

    await service.listRepos(SCOPE);
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect((await service.listRepos(SCOPE)).cached).toBe(true);
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect((await service.listRepos(SCOPE)).cached).toBe(false);
    expect(repoCalls(fetchImpl)).toBe(2);
  });

  it('caches per user, so one user\'s list never leaks into another\'s', async () => {
    const fetchImpl = fakeFetch([[restRepo({ id: 1, full_name: 'bilo-io/app' })]]);
    const service = new GithubService(
      fakeTokens('t'),
      fakeRepos([]),
      config([devRoot]),
      { fetchImpl },
      home,
    );
    await service.listRepos(SCOPE);
    expect((await service.listRepos(OTHER_SCOPE)).cached).toBe(false);
    expect(repoCalls(fetchImpl)).toBe(2);
  });

  it('derives scan roots from the registry when none are configured', async () => {
    await makeCheckout('sibling', 'bilo-io/sibling');
    const service = new GithubService(
      fakeTokens('t'),
      fakeRepos([registryRow({ name: 'midnite', path: '~/Dev/midnite', ownerRepo: 'bilo-io/midnite' })]),
      config(), // no github.checkoutRoots
      { fetchImpl: fakeFetch([[restRepo({ id: 1, full_name: 'bilo-io/sibling' })]]) },
      home,
    );

    const res = await service.listRepos();

    // `~/Dev/midnite` is registered, so `~/Dev` is scanned and its siblings are found.
    expect(res.scannedRoots).toEqual(['~/Dev']);
    expect(res.items[0]!.checkoutState).toBe('on-disk');
  });

  it('reports the scanned roots in `~`-form so an empty match set is explicable', async () => {
    const service = new GithubService(
      fakeTokens('t'),
      fakeRepos([]),
      config([devRoot]),
      { fetchImpl: fakeFetch([[]]) },
      home,
    );
    expect((await service.listRepos()).scannedRoots).toEqual(['~/Dev']);
  });

  it('throws GithubNotConnectedError when no token resolves', async () => {
    const service = new GithubService(fakeTokens(null), fakeRepos([]), config(), {}, home);
    await expect(service.listRepos(SCOPE)).rejects.toBeInstanceOf(GithubNotConnectedError);
  });

  it('reads the registry through the caller\'s team scope', async () => {
    // Annotating against rows the caller can't see would disable the import button for a
    // repo they could legitimately register, and leak another user's checkout paths.
    const repos = fakeRepos([]);
    const service = new GithubService(
      fakeTokens('t'),
      repos,
      config([devRoot]),
      { fetchImpl: fakeFetch([[restRepo({ id: 1, full_name: 'bilo-io/app' })]]) },
      home,
    );

    await service.listRepos(SCOPE);

    expect(repos.scopes.length).toBeGreaterThan(0);
    expect(repos.scopes.every((s) => s === SCOPE)).toBe(true);
  });

  it('re-casts a rejected token as not-connected rather than letting a 500 escape', async () => {
    // A revoked PAT resolves fine and then 401s. `getConnection` already calls that
    // `connected: false`; the list route must tell the same story, not show a red error.
    const rejecting = vi.fn(
      async () => new Response(JSON.stringify({ message: 'Bad credentials' }), { status: 401 }),
    ) as unknown as typeof fetch;
    const service = new GithubService(
      fakeTokens('revoked'),
      fakeRepos([]),
      config([devRoot]),
      { fetchImpl: rejecting },
      home,
    );

    await expect(service.listRepos(SCOPE)).rejects.toBeInstanceOf(GithubNotConnectedError);
  });

  it('lets a non-auth GitHub failure through as an upstream error', async () => {
    // A rate limit is not "reconnect" — the controller maps it to 502, and conflating it
    // with not-connected would send the user to a connect prompt that changes nothing.
    const limited = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: 'rate limited' }), {
          status: 403,
          headers: { 'x-ratelimit-remaining': '0' },
        }),
    ) as unknown as typeof fetch;
    const service = new GithubService(
      fakeTokens('t'),
      fakeRepos([]),
      config([devRoot]),
      { fetchImpl: limited },
      home,
    );

    const err = await service.listRepos(SCOPE).catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(GithubNotConnectedError);
    expect((err as Error).message).toContain('rate limit');
  });
});

describe('GithubService.getConnection', () => {
  it('reports the login, avatar, scopes and token source', async () => {
    const service = new GithubService(
      fakeTokens('t'),
      fakeRepos([]),
      config(),
      { fetchImpl: fakeFetch([[]]) },
      home,
    );
    await expect(service.getConnection('user-1')).resolves.toEqual({
      connected: true,
      source: 'pat',
      login: 'octo',
      avatarUrl: 'https://a/i.png',
      scopes: ['repo', 'project', 'read:org'],
    });
  });

  it('reports an empty scope list for a token GitHub sends no scope header for', async () => {
    const service = new GithubService(
      fakeTokens('t'),
      fakeRepos([]),
      config(),
      { fetchImpl: fakeFetch([[]], '') },
      home,
    );
    expect((await service.getConnection()).scopes).toEqual([]);
  });

  it('reports disconnected — not a 500 — when GitHub rejects the token', async () => {
    // The user's next action is "reconnect" either way; a 500 would just be noise.
    const rejecting = vi.fn(
      async () => new Response(JSON.stringify({ message: 'Bad credentials' }), { status: 401 }),
    ) as unknown as typeof fetch;
    const service = new GithubService(
      fakeTokens('revoked'),
      fakeRepos([]),
      config(),
      { fetchImpl: rejecting },
      home,
    );
    await expect(service.getConnection()).resolves.toEqual({ connected: false, scopes: [] });
  });

  it('reports disconnected when nothing resolves', async () => {
    const service = new GithubService(fakeTokens(null), fakeRepos([]), config(), {}, home);
    await expect(service.getConnection()).resolves.toEqual({ connected: false, scopes: [] });
  });
});

describe('GithubService.importRepo', () => {
  it('needs no typing for a matched checkout — name, path and ownerRepo are inferred', async () => {
    await makeCheckout('midnite', 'bilo-io/midnite');
    const repos = fakeRepos([]);
    const service = new GithubService(fakeTokens('t'), repos, config([devRoot]), {}, home);

    const created = await service.importRepo({ ownerRepo: 'bilo-io/midnite' }, SCOPE);

    expect(created.name).toBe('midnite');
    expect(repos.created).toEqual([
      { name: 'midnite', path: '~/Dev/midnite', ownerRepo: 'bilo-io/midnite' },
    ]);
  });

  it('honours an explicit name and path over the inferred ones', async () => {
    await makeCheckout('midnite', 'bilo-io/midnite');
    const repos = fakeRepos([]);
    const service = new GithubService(fakeTokens('t'), repos, config([devRoot]), {}, home);

    await service.importRepo(
      { ownerRepo: 'bilo-io/midnite', name: 'mn', path: '~/elsewhere/mn' },
      SCOPE,
    );

    expect(repos.created).toEqual([
      { name: 'mn', path: '~/elsewhere/mn', ownerRepo: 'bilo-io/midnite' },
    ]);
  });

  it('refuses to create a pathless row for a repo that is not checked out', async () => {
    // A registry row with no usable path is one the board would later fail to spawn in;
    // rejecting here is why the UI prefills the create form for unmatched repos instead.
    const service = new GithubService(fakeTokens('t'), fakeRepos([]), config([devRoot]), {}, home);
    await expect(service.importRepo({ ownerRepo: 'bilo-io/ghost' })).rejects.toBeInstanceOf(
      GithubRepoNotCheckedOutError,
    );
  });
});

function repoCalls(fetchImpl: typeof fetch): number {
  return vi.mocked(fetchImpl).mock.calls.filter(([u]) => String(u).includes('/user/repos')).length;
}
