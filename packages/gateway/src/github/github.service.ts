import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  type GithubConnection,
  type GithubRepo,
  type GithubReposResponse,
  type ImportGithubRepoRequest,
  type MidniteConfig,
  type Repo,
  type TeamScope,
} from '@midnite/shared';

import { MIDNITE_CONFIG } from '../config.token';
import { collapseTilde, expandTilde } from '../fs/path-tilde';
import { ReposService } from '../repos/repos.service';
import { GithubTokenService } from './github-token.service';
import { GITHUB_FETCH_OPTIONS, GITHUB_HOME_DIR } from './github.tokens';
import { ownerRepoKey } from './lib/github-remote';
import {
  fetchAuthenticatedUser,
  fetchUserRepos,
  GithubApiError,
  type GithubFetchOptions,
  type GithubRestRepo,
} from './lib/github-rest';
import { deriveCheckoutRoots, matchCheckouts } from './lib/match-checkouts';

/** The install has no resolvable GitHub token — the caller turns this into a 409. */
export class GithubNotConnectedError extends Error {
  constructor() {
    super('no GitHub connection — connect GitHub to browse your repositories');
    this.name = 'GithubNotConnectedError';
  }
}

/** An import was asked for with no path and no checkout on disk to infer one from. */
export class GithubRepoNotCheckedOutError extends Error {
  constructor(readonly ownerRepo: string) {
    super(`${ownerRepo} is not checked out locally — supply a path to register it`);
    this.name = 'GithubRepoNotCheckedOutError';
  }
}

/** How long a fetched repo list is reused before GitHub is asked again. */
const CACHE_TTL_MS = 5 * 60 * 1000;
/** Cache key for calls with no acting user (auth disabled — a single-user install). */
const ANONYMOUS_CACHE_KEY = '__anonymous__';

type CacheEntry = {
  items: GithubRestRepo[];
  fetchedAt: string;
  expiresAt: number;
};

/**
 * Repo discovery: the signed-in user's GitHub repositories, annotated with whether each
 * one is already a midnite repo, sitting on disk unregistered, or not checked out at
 * all (Phase 84 Theme B).
 *
 * Two things are cached and two deliberately are not. The **GitHub list** is cached per
 * user for {@link CACHE_TTL_MS} — it costs several sequential paginated calls and barely
 * changes minute to minute. The **checkout scan** and the **registry lookup** are redone
 * on every request: both are local and cheap, and they're exactly what changes while
 * someone is using this page (they clone a repo, or they import one), so a stale
 * annotation would be the bug the cache introduced.
 */
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @Inject(GithubTokenService) private readonly tokens: GithubTokenService,
    @Inject(ReposService) private readonly repos: ReposService,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    // Environment seams as **named** providers (see `github.tokens.ts`): the module
    // supplies real values, so a wiring mistake is a boot error rather than a silently
    // undefined dep, and a unit spec still constructs this directly with a faked
    // `fetch` and a temp-dir home.
    @Inject(GITHUB_FETCH_OPTIONS) private readonly fetchOptions: GithubFetchOptions,
    @Inject(GITHUB_HOME_DIR) private readonly home: string,
  ) {}

  /**
   * Connection state for the Settings card. Never throws: "not connected" is an
   * answer, and a token that GitHub rejects is reported as disconnected rather than as
   * a 500 — the user's next action ("reconnect") is the same either way.
   */
  async getConnection(userId?: string): Promise<GithubConnection> {
    const resolved = await this.tokens.resolve(userId);
    if (!resolved) return { connected: false, scopes: [] };
    try {
      const { user, scopes } = await fetchAuthenticatedUser(resolved.token, this.fetchOptions);
      return {
        connected: true,
        source: resolved.source,
        login: user.login,
        avatarUrl: user.avatar_url ?? undefined,
        scopes,
      };
    } catch (err) {
      this.logger.warn(`GitHub token resolved (${resolved.source}) but /user failed: ${message(err)}`);
      return { connected: false, scopes: [] };
    }
  }

  /**
   * The annotated repo list. Throws {@link GithubNotConnectedError} when no token
   * resolves **or** when the one that did is rejected by GitHub — a revoked PAT is
   * "not connected" from the user's point of view, and their next action (reconnect)
   * is the same, so it must not surface as a 500. `getConnection` already reports that
   * state as `connected: false`; this keeps the two routes telling the same story.
   */
  async listRepos(scope?: TeamScope, opts?: { refresh?: boolean }): Promise<GithubReposResponse> {
    const resolved = await this.tokens.resolve(scope?.userId);
    if (!resolved) throw new GithubNotConnectedError();

    const cacheKey = scope?.userId ?? ANONYMOUS_CACHE_KEY;
    const cached = opts?.refresh ? undefined : this.readCache(cacheKey);
    const raw = cached ?? {
      items: await this.fetchRepos(resolved.token),
      fetchedAt: new Date().toISOString(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    if (!cached) this.cache.set(cacheKey, raw);

    // The registry is read through the caller's team scope, exactly as `GET /repos` is:
    // annotating against rows the user can't see would disable the import button for a
    // repo they *could* register, and leak another user's checkout paths back to them.
    const registryRows = this.repos.list(scope);
    const roots = this.resolveScanRoots(registryRows);
    const checkouts = await matchCheckouts(roots);
    const registered = byOwnerRepo(registryRows);

    return {
      items: raw.items.map((r) => this.annotate(r, checkouts, registered)),
      fetchedAt: raw.fetchedAt,
      cached: cached !== undefined,
      scannedRoots: roots.map((r) => collapseTilde(r, this.home)),
    };
  }

  /** `/user/repos`, with a 401 re-cast as "not connected" (see {@link listRepos}). */
  private async fetchRepos(token: string): Promise<GithubRestRepo[]> {
    try {
      return await fetchUserRepos(token, this.fetchOptions);
    } catch (err) {
      if (err instanceof GithubApiError && err.status === 401) {
        this.logger.warn('GitHub rejected the resolved token — reporting as not connected');
        throw new GithubNotConnectedError();
      }
      throw err;
    }
  }

  /**
   * Create a registry row from a browsed repo. `name` defaults to the bare repo name
   * and `path` to the matched checkout, which is what makes importing an on-disk repo
   * typing-free; a repo with neither a supplied nor a matched path is rejected here
   * rather than landing a half-configured row the board would then fail to spawn in.
   */
  async importRepo(req: ImportGithubRepoRequest, scope?: TeamScope): Promise<Repo> {
    const matched = req.path
      ? undefined
      : (await matchCheckouts(this.resolveScanRoots(this.repos.list(scope)))).get(
          ownerRepoKey(req.ownerRepo),
        );
    const path = req.path ?? (matched ? collapseTilde(matched.path, this.home) : undefined);
    if (!path) {
      throw new GithubRepoNotCheckedOutError(req.ownerRepo);
    }
    const name = req.name ?? req.ownerRepo.split('/')[1]!;
    return this.repos.create({ name, path, ownerRepo: req.ownerRepo }, scope?.userId);
  }

  /**
   * Configured `github.checkoutRoots`, or — when unset — the parent directory of every
   * registered repo path, so a populated install discovers its siblings with no
   * configuration. Returned absolute (`~` expanded); the response reports them back in
   * `~`-form so an empty match set is explicable to the user.
   */
  private resolveScanRoots(registryRows: readonly Repo[]): string[] {
    const configured = this.config.github?.checkoutRoots ?? [];
    if (configured.length > 0) return configured.map((r) => expandTilde(r, this.home));
    return deriveCheckoutRoots(registryRows.map((r) => expandTilde(r.path, this.home)));
  }

  private annotate(
    raw: GithubRestRepo,
    checkouts: Map<string, { path: string }>,
    registered: Map<string, Repo>,
  ): GithubRepo {
    const ownerRepo = raw.full_name;
    const key = ownerRepoKey(ownerRepo);
    const registryRow = registered.get(key);
    const checkout = checkouts.get(key);
    // A registered repo's own recorded path is the truth about where it lives — prefer
    // it over a scan hit, which may have found a second clone of the same repo.
    const localPath = registryRow?.path ?? (checkout ? collapseTilde(checkout.path, this.home) : undefined);
    return {
      id: raw.id,
      name: raw.name,
      ownerRepo,
      owner: raw.owner?.login ?? ownerRepo.split('/')[0]!,
      private: raw.private,
      fork: raw.fork,
      archived: raw.archived,
      defaultBranch: raw.default_branch,
      description: raw.description ?? undefined,
      htmlUrl: raw.html_url,
      pushedAt: raw.pushed_at ?? undefined,
      localPath,
      registeredRepoId: registryRow?.id,
      checkoutState: registryRow ? 'registered' : checkout ? 'on-disk' : 'not-checked-out',
    };
  }

  private readCache(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return entry;
  }
}

/**
 * Registry rows keyed by case-folded `owner/repo`. Only rows carrying an `ownerRepo`
 * can be matched — a hand-typed row without one is invisible here, which is honest:
 * nothing links it to a GitHub repository.
 */
function byOwnerRepo(rows: readonly Repo[]): Map<string, Repo> {
  const index = new Map<string, Repo>();
  for (const repo of rows) {
    if (!repo.ownerRepo) continue;
    const key = ownerRepoKey(repo.ownerRepo);
    if (!index.has(key)) index.set(key, repo);
  }
  return index;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
