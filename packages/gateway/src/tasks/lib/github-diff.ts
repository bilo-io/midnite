import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseGithubPr, type PrDiffFile, type PrDiffHunk, type PrDiffLine } from '@midnite/shared';

const execFileAsync = promisify(execFile);

const GH_TIMEOUT_MS = 10_000;
const GH_MAX_BUFFER = 20 * 1024 * 1024; // 20 MiB — plenty for a raw PR diff
const USER_AGENT =
  'Mozilla/5.0 (compatible; midnite-pr-diff/1.0; +https://github.com/bilo-io/midnite-app)';

/** Default byte budget for the included files of a structured diff (Decision §6). */
export const DEFAULT_MAX_DIFF_BYTES = 1_000_000;

export type ExecFileFn = (
  file: string,
  args: string[],
  opts: { timeout: number; maxBuffer: number; signal?: AbortSignal },
) => Promise<{ stdout: string }>;

export interface FetchDiffOptions {
  /** Bearer token (workflow credential) — enables the REST-with-auth primary path. */
  token?: string;
  signal?: AbortSignal;
  /** Injectable for tests; defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests; defaults to `execFile('gh', …)`. */
  execFileImpl?: ExecFileFn;
  timeoutMs?: number;
}

/**
 * Fetch a GitHub PR's raw unified diff, fail-open (returns `null` when every
 * source fails). Ladder: **REST + Bearer token** (when a token is supplied) →
 * **`gh pr diff`** (the user's auth → private repos) → **anonymous REST** (public
 * repos). Mirrors the fallback shape of {@link PrStatusService}, extended with the
 * token-primary path the workflow executor uses. GitHub-only (Decision §8).
 */
export async function fetchGithubPrDiff(
  prUrl: string,
  opts: FetchDiffOptions = {},
): Promise<string | null> {
  const parsed = parseGithubPr(prUrl);
  if (!parsed) return null;
  const { repo, prNumber } = parsed;

  if (opts.token) {
    const viaToken = await fetchRestDiff(repo, prNumber, opts.token, opts);
    if (viaToken !== null) return viaToken;
  }

  const viaGh = await fetchGhDiff(prUrl, opts);
  if (viaGh !== null) return viaGh;

  return fetchRestDiff(repo, prNumber, undefined, opts);
}

/** GitHub REST diff (`Accept: vnd.github.v3.diff`), optionally authenticated. null on any failure. */
async function fetchRestDiff(
  repo: string,
  prNumber: number,
  token: string | undefined,
  opts: FetchDiffOptions,
): Promise<string | null> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    accept: 'application/vnd.github.v3.diff',
    'user-agent': USER_AGENT,
    'x-github-api-version': '2022-11-28',
  };
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}/pulls/${prNumber}`, {
      headers,
      signal: opts.signal ?? AbortSignal.timeout(opts.timeoutMs ?? GH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** `gh pr diff <url>` — uses the user's gh auth (covers private repos). null on any failure. */
async function fetchGhDiff(prUrl: string, opts: FetchDiffOptions): Promise<string | null> {
  const exec = opts.execFileImpl ?? (execFileAsync as unknown as ExecFileFn);
  try {
    const { stdout } = await exec('gh', ['pr', 'diff', prUrl], {
      timeout: opts.timeoutMs ?? GH_TIMEOUT_MS,
      maxBuffer: GH_MAX_BUFFER,
      signal: opts.signal,
    });
    return stdout;
  } catch {
    return null;
  }
}

// --- unified-diff parsing ---------------------------------------------------

export interface ParsedDiff {
  files: PrDiffFile[];
  additions: number;
  deletions: number;
  truncated: boolean;
  hiddenFileCount: number;
  hiddenFiles: string[];
}

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

/**
 * Parse a raw git unified diff into structured files + hunks, enforcing a byte
 * budget: whole files past `maxBytes` are dropped (never split mid-file) and
 * reported via `truncated`/`hiddenFiles`. The first file is always included so a
 * single oversized file never yields an empty diff.
 */
export function parseUnifiedDiff(raw: string, maxBytes = DEFAULT_MAX_DIFF_BYTES): ParsedDiff {
  const blocks = raw.split(/(?=^diff --git )/m).filter((b) => b.startsWith('diff --git '));

  const files: PrDiffFile[] = [];
  const hiddenFiles: string[] = [];
  let additions = 0;
  let deletions = 0;
  let usedBytes = 0;

  for (const block of blocks) {
    const blockBytes = Buffer.byteLength(block, 'utf8');
    const overBudget = usedBytes + blockBytes > maxBytes && files.length > 0;
    if (overBudget) {
      hiddenFiles.push(pathFromBlock(block));
      continue;
    }
    usedBytes += blockBytes;
    const file = parseFileBlock(block);
    additions += file.additions;
    deletions += file.deletions;
    files.push(file);
  }

  return {
    files,
    additions,
    deletions,
    truncated: hiddenFiles.length > 0,
    hiddenFileCount: hiddenFiles.length,
    hiddenFiles,
  };
}

/** Cheap path extraction for a file we're skipping (no hunk parse). */
function pathFromBlock(block: string): string {
  const first = block.slice(0, block.indexOf('\n'));
  const m = /^diff --git a\/(.+) b\/(.+)$/.exec(first);
  return m ? (m[2] as string) : first.replace(/^diff --git /, '');
}

function parseFileBlock(block: string): PrDiffFile {
  const lines = block.split('\n');
  const header = lines[0] ?? '';
  const gitMatch = /^diff --git a\/(.+) b\/(.+)$/.exec(header);
  let oldPath = gitMatch ? (gitMatch[1] as string) : '';
  let newPath = gitMatch ? (gitMatch[2] as string) : oldPath;

  let status: PrDiffFile['status'] = 'modified';
  let binary = false;
  let renamed = false;

  // Header lines run until the first hunk (`@@`).
  let i = 1;
  for (; i < lines.length; i++) {
    const line = lines[i] as string;
    if (line.startsWith('@@')) break;
    if (line.startsWith('new file mode')) status = 'added';
    else if (line.startsWith('deleted file mode')) status = 'removed';
    else if (line.startsWith('rename from ')) {
      oldPath = line.slice('rename from '.length);
      renamed = true;
    } else if (line.startsWith('rename to ')) {
      newPath = line.slice('rename to '.length);
      renamed = true;
    } else if (line.startsWith('Binary files') || line.startsWith('GIT binary patch')) {
      binary = true;
    } else if (line.startsWith('--- ') && line.slice(4).trim() === '/dev/null') {
      status = 'added';
    } else if (line.startsWith('+++ ') && line.slice(4).trim() === '/dev/null') {
      status = 'removed';
    }
  }
  if (renamed && status === 'modified') status = 'renamed';

  const path = status === 'removed' ? oldPath : newPath;
  const hunks: PrDiffHunk[] = [];
  let additions = 0;
  let deletions = 0;

  let current: PrDiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;
  for (; i < lines.length; i++) {
    const line = lines[i] as string;
    const hunkMatch = HUNK_RE.exec(line);
    if (hunkMatch) {
      const oldStart = Number(hunkMatch[1]);
      const oldLines = hunkMatch[2] === undefined ? 1 : Number(hunkMatch[2]);
      const newStart = Number(hunkMatch[3]);
      const newLines = hunkMatch[4] === undefined ? 1 : Number(hunkMatch[4]);
      current = { header: line, oldStart, oldLines, newStart, newLines, lines: [] };
      hunks.push(current);
      oldLine = oldStart;
      newLine = newStart;
      continue;
    }
    if (!current) continue; // preamble between header and first hunk
    if (line.startsWith('\\')) continue; // "\ No newline at end of file"
    // A truly empty string is the trailing-newline artifact of `split('\n')`, not
    // a diff line — a real blank context line is a single space (' '). Skip it so
    // it doesn't inflate the line counters.
    if (line === '') continue;

    const marker = line[0];
    const content = line.slice(1);
    if (marker === '+') {
      current.lines.push({ kind: 'add', content, newLine });
      newLine++;
      additions++;
    } else if (marker === '-') {
      current.lines.push({ kind: 'del', content, oldLine });
      oldLine++;
      deletions++;
    } else {
      // context line: ' ' prefix (content is the rest, '' for a blank line).
      const ctx: PrDiffLine = { kind: 'context', content, oldLine, newLine };
      current.lines.push(ctx);
      oldLine++;
      newLine++;
    }
  }

  return { path, oldPath: renamed ? oldPath : undefined, status, additions, deletions, binary, hunks };
}
