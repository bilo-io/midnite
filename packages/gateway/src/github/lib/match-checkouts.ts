import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { normalizeGitRemote, ownerRepoKey, parseGitConfigRemotes, pickRemoteUrl } from './github-remote';

// Matching GitHub repositories to checkouts that already exist on this machine
// (Phase 84 Theme B, Decision §2 — we **match**, we never clone). Given a set of
// roots, walk each one level deep, read every candidate's `.git/config`, and build an
// `owner/repo` → absolute-path index the repo browser annotates its list with.

/** Directory names never worth descending into when deriving/scanning roots. */
const SKIPPED_DIRS = new Set(['node_modules', '.git', '.Trash', 'Library']);

export type CheckoutMatch = {
  /** Absolute path of the checkout directory. */
  path: string;
  /** `owner/repo` as spelled by the remote. */
  ownerRepo: string;
};

/**
 * Index every git checkout directly inside `roots`, keyed by case-folded `owner/repo`.
 *
 * One level deep only: `~/Dev` holding `~/Dev/midnite` and `~/Dev/other` is the layout
 * this serves, and an unbounded recursive walk over a home directory is exactly the
 * kind of surprise a settings page shouldn't spring. Unreadable roots, unreadable
 * configs, and non-GitHub remotes are skipped silently — a scan is best-effort
 * annotation, never the reason a request fails.
 *
 * When two checkouts claim the same slug the first one encountered wins, and roots are
 * scanned in the order given, so an explicitly configured root outranks a derived one.
 */
export async function matchCheckouts(roots: readonly string[]): Promise<Map<string, CheckoutMatch>> {
  const matches = new Map<string, CheckoutMatch>();
  for (const root of dedupe(roots)) {
    for (const dir of await listCandidateDirs(root)) {
      const ownerRepo = await readCheckoutSlug(dir);
      if (!ownerRepo) continue;
      const key = ownerRepoKey(ownerRepo);
      if (!matches.has(key)) matches.set(key, { path: dir, ownerRepo });
    }
  }
  return matches;
}

/**
 * The `owner/repo` a checkout's git remote points at, or `null` when the directory
 * isn't a GitHub checkout.
 *
 * `.git` as a **file** (a worktree or submodule) carries a `gitdir:` pointer rather
 * than a config, so the pointed-at admin directory is read instead. That matters here:
 * midnite's own workflow puts every branch in a `.worktrees/<branch>` worktree, and
 * treating those as "not a repo" would make the tool blind to its own layout.
 */
export async function readCheckoutSlug(dir: string): Promise<string | null> {
  const configPath = await resolveGitConfigPath(dir);
  if (!configPath) return null;
  let text: string;
  try {
    text = await readFile(configPath, 'utf8');
  } catch {
    return null;
  }
  const url = pickRemoteUrl(parseGitConfigRemotes(text));
  return url ? normalizeGitRemote(url) : null;
}

/**
 * Roots to scan when `github.checkoutRoots` is unset: the parent directory of every
 * path already in the repo registry. A populated install therefore discovers its
 * siblings with no configuration — the recorded default for this theme.
 *
 * Paths must already be absolute (the caller expands `~`). A path whose parent is the
 * filesystem root is dropped rather than turning a scan loose on `/`.
 */
export function deriveCheckoutRoots(registeredPaths: readonly string[]): string[] {
  const roots: string[] = [];
  for (const path of registeredPaths) {
    if (!path.startsWith('/')) continue;
    const parent = dirname(path);
    if (parent === '/' || parent === path) continue;
    if (!roots.includes(parent)) roots.push(parent);
  }
  return roots;
}

/** Immediate subdirectories of `root` (plus `root` itself, which may be a checkout). */
async function listCandidateDirs(root: string): Promise<string[]> {
  const dirs: string[] = [];
  if (await isDirectory(root)) dirs.push(root);
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return dirs; // missing or unreadable root — nothing to annotate with
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || SKIPPED_DIRS.has(entry.name)) continue;
    // `isDirectory()` is false for a symlinked directory, which is a legitimate way to
    // keep a checkout elsewhere — stat those rather than skipping them.
    if (entry.isDirectory()) dirs.push(join(root, entry.name));
    else if (entry.isSymbolicLink() && (await isDirectory(join(root, entry.name)))) {
      dirs.push(join(root, entry.name));
    }
  }
  return dirs;
}

/** Path of the `config` file for the checkout at `dir`, resolving worktree pointers. */
async function resolveGitConfigPath(dir: string): Promise<string | null> {
  const dotGit = join(dir, '.git');
  let info;
  try {
    info = await stat(dotGit);
  } catch {
    return null;
  }
  if (info.isDirectory()) return join(dotGit, 'config');
  if (!info.isFile()) return null;
  // Worktree/submodule: `gitdir: /abs/path/.git/worktrees/<name>`. The config lives in
  // the shared admin dir two levels up, not in the per-worktree directory.
  let pointer: string;
  try {
    pointer = await readFile(dotGit, 'utf8');
  } catch {
    return null;
  }
  const gitdir = /^gitdir:\s*(.+)$/m.exec(pointer)?.[1]?.trim();
  if (!gitdir) return null;
  const absolute = gitdir.startsWith('/') ? gitdir : join(dir, gitdir);
  // `lastIndexOf`, not `indexOf`: a checkout that itself lives under a directory called
  // `worktrees` (midnite's own `.worktrees/<branch>` layout, for one) would otherwise
  // truncate at the *outer* segment and point at a config path that doesn't exist.
  const worktrees = absolute.lastIndexOf('/worktrees/');
  const commonDir = worktrees === -1 ? absolute : absolute.slice(0, worktrees);
  return join(commonDir, 'config');
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

function dedupe(values: readonly string[]): string[] {
  return [...new Set(values.filter((v) => v.length > 0))];
}
