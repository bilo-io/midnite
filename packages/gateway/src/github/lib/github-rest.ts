// Thin GitHub REST helpers for the connected-GitHub surface (Phase 84 Theme B).
//
// Deliberately not a client class: these are pure-ish functions taking a token and an
// injectable `fetch`, mirroring how `tasks/lib/github-diff.ts` is structured, so the
// service that owns caching and annotation stays the only stateful piece. Theme E adds
// the GraphQL sibling for Projects v2.

const API_ROOT = 'https://api.github.com';
const USER_AGENT =
  'Mozilla/5.0 (compatible; midnite-github/1.0; +https://github.com/bilo-io/midnite-app)';
const REQUEST_TIMEOUT_MS = 15_000;
/** GitHub's maximum page size for `/user/repos`. */
const PER_PAGE = 100;
/** Hard cap on pages followed — 10 × 100 repos is far beyond any real account here. */
const MAX_PAGES = 10;

export type GithubFetchOptions = {
  /** Injectable for tests; defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
};

/** A GitHub API call that failed. `status` is 0 for a transport error. */
export class GithubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'GithubApiError';
  }
}

/** The shape of `/user/repos` entries we depend on — everything else is ignored. */
export type GithubRestRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  default_branch: string;
  description: string | null;
  html_url: string;
  pushed_at: string | null;
  owner: { login: string } | null;
};

export type GithubRestUser = {
  login: string;
  avatar_url: string | null;
};

/**
 * Every repository the token can see, following pagination to the end.
 *
 * `affiliation` asks for personally-owned repos, org repos and repos the user was
 * added to as a collaborator — the three things "my repos" means to a person — and
 * `sort=pushed` means a truncated list (if the cap ever bites) keeps the repos someone
 * is actually working in.
 */
export async function fetchUserRepos(
  token: string,
  opts: GithubFetchOptions = {},
): Promise<GithubRestRepo[]> {
  const all: GithubRestRepo[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const query = new URLSearchParams({
      per_page: String(PER_PAGE),
      page: String(page),
      sort: 'pushed',
      affiliation: 'owner,collaborator,organization_member',
    });
    const batch = await githubJson<GithubRestRepo[]>(`/user/repos?${query.toString()}`, token, opts);
    if (!Array.isArray(batch)) break;
    all.push(...batch);
    if (batch.length < PER_PAGE) break; // short page — that was the last one
  }
  return all;
}

/**
 * The authenticated user, plus the scopes GitHub reports for the token.
 *
 * `x-oauth-scopes` is the honest answer to "what did I actually grant?" — it comes back
 * on any authenticated request and is absent (not empty) for tokens that don't carry
 * OAuth scopes at all, such as a `gh` CLI token minted for the CLI's own app.
 */
export async function fetchAuthenticatedUser(
  token: string,
  opts: GithubFetchOptions = {},
): Promise<{ user: GithubRestUser; scopes: string[] }> {
  const res = await githubRequest('/user', token, opts);
  const body = (await res.json()) as GithubRestUser;
  return { user: body, scopes: parseScopes(res.headers.get('x-oauth-scopes')) };
}

/** `"repo, read:org"` → `['repo','read:org']`; absent/blank → `[]`. */
export function parseScopes(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function githubJson<T>(
  path: string,
  token: string,
  opts: GithubFetchOptions,
): Promise<T> {
  const res = await githubRequest(path, token, opts);
  return (await res.json()) as T;
}

async function githubRequest(
  path: string,
  token: string,
  opts: GithubFetchOptions,
): Promise<Response> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${API_ROOT}${path}`, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'user-agent': USER_AGENT,
        'x-github-api-version': '2022-11-28',
      },
      signal: opts.signal ?? AbortSignal.timeout(opts.timeoutMs ?? REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new GithubApiError(`GitHub request to ${path} failed`, 0, { cause: err });
  }
  if (!res.ok) {
    // 403 with a zeroed rate-limit remaining is a rate limit, not a permission problem;
    // saying so is the difference between "wait" and "reconnect with more scopes".
    const rateLimited = res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0';
    const detail = rateLimited ? 'GitHub API rate limit exceeded' : await errorDetail(res);
    throw new GithubApiError(detail, res.status);
  }
  return res;
}

async function errorDetail(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  if (text) {
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed.message === 'string' && parsed.message) return parsed.message;
    } catch {
      // Not JSON — fall through to the status line.
    }
  }
  return `GitHub API responded ${res.status}`;
}
