import { spawn } from 'node:child_process';
import { parseGithubPr, toGithubReviewEvent, type PrMergeMethod, type PrReviewSubmission } from '@midnite/shared';

// Phase 52 Theme C — write-back helpers for reviewing/merging a task's PR. Auth
// ladder mirrors the read path (github-diff) but has no anonymous tier — writes
// need identity: the authenticated **`gh` CLI** is primary (same auth pr-status
// uses); a workflow-credential **REST token** is the fallback when `gh` is
// unavailable. GitHub-only. Any failure surfaces the API/CLI message (branch
// protection, unmergeable, auth) rather than being swallowed.

const GH_TIMEOUT_MS = 15_000;
const MAX_BUFFER = 10 * 1024 * 1024;
const API_VERSION = '2022-11-28';

/** Runs `gh` with optional stdin, resolving stdout or rejecting with stderr.
 *  Injectable so specs never shell out. */
export type GhRunner = (args: string[], input?: string) => Promise<string>;

/** Lazily provides a REST fallback token (a github workflow credential). */
export type TokenProvider = () => Promise<string | undefined>;

export interface GithubWriteOptions {
  runGh?: GhRunner;
  getToken?: TokenProvider;
  fetchImpl?: typeof fetch;
}

const defaultRunGh: GhRunner = (args, input) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn('gh', args, { timeout: GH_TIMEOUT_MS });
    let out = '';
    let err = '';
    let size = 0;
    child.stdout.on('data', (d: Buffer) => {
      size += d.length;
      if (size <= MAX_BUFFER) out += d.toString('utf8');
    });
    child.stderr.on('data', (d: Buffer) => (err += d.toString('utf8')));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(out) : reject(new Error(err.trim() || `gh exited ${code}`)),
    );
    if (input !== undefined) child.stdin.end(input);
    else child.stdin.end();
  });

function apiBaseFor(prUrl: string): string {
  const origin = new URL(prUrl).origin;
  return new URL(prUrl).hostname === 'github.com' ? 'https://api.github.com' : `${origin}/api/v3`;
}

export interface ReviewResult {
  htmlUrl?: string;
  state?: string;
}

/**
 * Submit a batched review (approve / request-changes / comment, with optional
 * inline comments) on the task's PR. `gh api` primary → REST-with-token fallback.
 */
export async function submitGithubReview(
  prUrl: string,
  submission: PrReviewSubmission,
  opts: GithubWriteOptions = {},
): Promise<ReviewResult> {
  const parsed = parseGithubPr(prUrl);
  if (!parsed) throw new Error(`cannot parse GitHub PR URL: ${prUrl}`);
  const { repo, prNumber } = parsed;
  const body = {
    event: toGithubReviewEvent(submission.event),
    ...(submission.body ? { body: submission.body } : {}),
    ...(submission.comments.length > 0
      ? { comments: submission.comments.map((c) => ({ path: c.path, line: c.line, side: c.side, body: c.body })) }
      : {}),
  };
  const path = `repos/${repo}/pulls/${prNumber}/reviews`;

  const runGh = opts.runGh ?? defaultRunGh;
  try {
    const stdout = await runGh(['api', '--method', 'POST', path, '--input', '-'], JSON.stringify(body));
    const json = JSON.parse(stdout) as { html_url?: string; state?: string };
    return { htmlUrl: json.html_url, state: json.state };
  } catch (ghErr) {
    const token = await opts.getToken?.();
    if (!token) throw ghErr;
    return restReview(prUrl, path, body, token, opts.fetchImpl ?? fetch);
  }
}

async function restReview(
  prUrl: string,
  path: string,
  body: unknown,
  token: string,
  fetchImpl: typeof fetch,
): Promise<ReviewResult> {
  const res = await fetchImpl(`${apiBaseFor(prUrl)}/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': API_VERSION,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(GH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API error ${res.status}: ${text || res.statusText}`);
  }
  const json = (await res.json()) as { html_url?: string; state?: string };
  return { htmlUrl: json.html_url, state: json.state };
}

/**
 * Merge the task's PR with the given method. `gh pr merge` primary (respects
 * mergeability + branch protection; its refusal is surfaced) → REST PUT fallback.
 */
export async function mergeGithubPr(
  prUrl: string,
  method: PrMergeMethod,
  opts: GithubWriteOptions = {},
): Promise<void> {
  const runGh = opts.runGh ?? defaultRunGh;
  try {
    await runGh(['pr', 'merge', prUrl, `--${method}`]);
    return;
  } catch (ghErr) {
    const token = await opts.getToken?.();
    if (!token) throw ghErr;
    await restMerge(prUrl, method, token, opts.fetchImpl ?? fetch);
  }
}

async function restMerge(
  prUrl: string,
  method: PrMergeMethod,
  token: string,
  fetchImpl: typeof fetch,
): Promise<void> {
  const parsed = parseGithubPr(prUrl);
  if (!parsed) throw new Error(`cannot parse GitHub PR URL: ${prUrl}`);
  const res = await fetchImpl(`${apiBaseFor(prUrl)}/repos/${parsed.repo}/pulls/${parsed.prNumber}/merge`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': API_VERSION,
    },
    body: JSON.stringify({ merge_method: method }),
    signal: AbortSignal.timeout(GH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API error ${res.status}: ${text || res.statusText}`);
  }
}
