import { GithubApiError, type GithubFetchOptions } from './github-rest';

// The repo's first GraphQL client (Phase 84 Theme E). GitHub Projects v2 has **no REST
// API** — GraphQL is the only way to reach it — so this exists purely because Projects
// forced it, not as a general migration away from `github-rest.ts`.
//
// Deliberately a leaf helper with no dependencies beyond the REST module's error type:
// the three existing `github-*.executor.ts` workflow nodes could adopt it later without
// pulling in the `github/` module.
//
// **The thing that makes GraphQL different from REST here, and the reason this isn't
// folded into `github-rest.ts`:** GitHub answers a failed GraphQL query with **HTTP 200**
// and an `errors[]` array in the body. Checking `res.ok` — which is exactly what the REST
// helper does, correctly — would treat a permission denial or a malformed query as
// success and hand the caller a `data` of nulls.

const GRAPHQL_URL = 'https://api.github.com/graphql';
const USER_AGENT =
  'Mozilla/5.0 (compatible; midnite-github/1.0; +https://github.com/bilo-io/midnite-app)';
const REQUEST_TIMEOUT_MS = 20_000;

/** What GitHub reports about the caller's remaining GraphQL budget, when it says. */
export type GithubRateLimit = {
  remaining: number;
  /** ISO-8601 reset time. */
  resetAt: string;
};

/** One entry of GitHub's `errors[]`. `type` is its own taxonomy, not an HTTP status. */
type GraphQlError = {
  message?: unknown;
  type?: unknown;
  path?: unknown;
};

type GraphQlEnvelope<T> = {
  data?: T | null;
  errors?: GraphQlError[];
};

export type GraphQlResult<T> = {
  data: T;
  /** Present when the response carried a `rateLimit` field the query asked for. */
  rateLimit?: GithubRateLimit;
};

/**
 * Run one GraphQL document.
 *
 * Throws {@link GithubApiError} on transport failure, on a non-2xx, and — the case that
 * matters — on a 200 carrying `errors[]`. The thrown `status` is the HTTP status, so a
 * 200-with-errors surfaces as `status: 200`; callers branch on
 * {@link isMissingScopeError} / {@link isNotFoundError} rather than on the number.
 */
export async function githubGraphQl<T>(
  document: string,
  variables: Record<string, unknown>,
  token: string,
  opts: GithubFetchOptions = {},
): Promise<GraphQlResult<T>> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'user-agent': USER_AGENT,
      },
      body: JSON.stringify({ query: document, variables }),
      signal: opts.signal ?? AbortSignal.timeout(opts.timeoutMs ?? REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new GithubApiError('GitHub GraphQL request failed', 0, { cause: err });
  }

  if (!res.ok) {
    // A 401 here means the token itself is bad; anything else is GitHub's problem.
    throw new GithubApiError(await httpErrorDetail(res), res.status);
  }

  let body: GraphQlEnvelope<T>;
  try {
    body = (await res.json()) as GraphQlEnvelope<T>;
  } catch (err) {
    throw new GithubApiError('GitHub GraphQL returned a non-JSON body', res.status, { cause: err });
  }

  if (body.errors?.length) {
    throw new GithubApiError(formatErrors(body.errors), res.status);
  }
  if (body.data == null) {
    // No errors and no data is not a shape GitHub documents; treat it as a failure rather
    // than handing the caller a null it will dereference.
    throw new GithubApiError('GitHub GraphQL returned neither data nor errors', res.status);
  }

  return { data: body.data, rateLimit: readRateLimit(body.data) };
}

/**
 * True when the failure is GitHub refusing for want of an OAuth scope.
 *
 * Projects v2 needs `project`, which a token minted before Theme A's connect flow — a
 * shared PAT, or the host's `gh` CLI auth — may well not carry. Distinguishing this from
 * a genuine 404 is what lets the caller say "reconnect to grant Projects access" instead
 * of GitHub's generic wording.
 */
export function isMissingScopeError(err: unknown): boolean {
  if (!(err instanceof GithubApiError)) return false;
  const message = err.message.toLowerCase();
  return (
    message.includes('insufficient_scopes') ||
    message.includes('resource not accessible') ||
    (message.includes('scope') && message.includes('project'))
  );
}

/** True when GitHub reported the node simply doesn't exist (or isn't visible to us). */
export function isNotFoundError(err: unknown): boolean {
  return err instanceof GithubApiError && err.message.toLowerCase().includes('not_found');
}

/** `errors[]` → one readable line, `type` included because it's how scopes are signalled. */
function formatErrors(errors: GraphQlError[]): string {
  const parts = errors.map((e) => {
    const message = typeof e.message === 'string' ? e.message : 'unknown GraphQL error';
    const type = typeof e.type === 'string' ? ` [${e.type}]` : '';
    return `${message}${type}`;
  });
  return `GitHub GraphQL error: ${parts.join('; ')}`;
}

/** Pull `rateLimit` off the response when the document asked for it. */
function readRateLimit(data: unknown): GithubRateLimit | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const raw = (data as { rateLimit?: unknown }).rateLimit;
  if (typeof raw !== 'object' || raw === null) return undefined;
  const { remaining, resetAt } = raw as { remaining?: unknown; resetAt?: unknown };
  if (typeof remaining !== 'number' || typeof resetAt !== 'string') return undefined;
  return { remaining, resetAt };
}

async function httpErrorDetail(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  if (text) {
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed.message === 'string' && parsed.message) return parsed.message;
    } catch {
      // Not JSON — fall through to the status line.
    }
  }
  return `GitHub GraphQL responded ${res.status}`;
}
