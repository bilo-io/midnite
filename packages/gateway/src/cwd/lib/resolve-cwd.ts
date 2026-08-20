import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import { expandTilde } from '../../fs/path-tilde';

/**
 * The working-directory precedence for an agent session's PTY.
 *
 * Resolution order, highest priority first:
 *   1. the session's repo path — **but only when it resolves at or under the
 *      project's work directory** (see below)
 *   2. the session's project work directory
 *   3. the global fallback working directory (set on the profile page)
 *   4. the gateway's own working directory
 *
 * **Phase 84 Theme D supersedes Phase 13 Decision §4.** Phase 13 treated
 * `project.workDir` and `task.repo` as orthogonal axes and let the project
 * directory win outright. That is the wrong way round for the common case: a
 * task that names a repo is the *more specific* signal, so an agent working a
 * `packages/gateway` task inside a monorepo project was still spawned at the
 * monorepo root. The repo now wins.
 *
 * The precedence is **containment-gated** rather than unconditional: the repo
 * only wins when its resolved path sits at or under the project's work
 * directory. A repo pointing somewhere else entirely is a genuine mismatch —
 * quietly relocating the agent to an unrelated checkout would be worse than the
 * bug being fixed — so the project directory still wins there and the choice is
 * reported back as {@link CwdChoice.repoOutsideProject} for the caller to log.
 * Phase 84 Theme C's `project_repos` join is what will let that case be
 * prevented at the source instead of merely detected.
 *
 * Each candidate is used only when non-empty, so a missing earlier candidate
 * cleanly defers to the next. Paths are compared in **canonical** form but
 * returned exactly as supplied (still `~`-form when the caller stored them that
 * way) — expansion of the winner stays the caller's job, as before.
 *
 * "Canonical" means `realpath`, not merely `resolve`, because two of the three
 * things that break a naive string comparison are everyday on this project's
 * primary platform: macOS's default APFS volume is **case-insensitive**, so
 * `~/Dev/Midnite` and `~/Dev/midnite` are one directory that `relative()` reports
 * as unrelated; and a **symlinked** checkout (this repo's own `.worktrees/`
 * convention invites them) resolves to a path outside the project it plainly
 * lives in. Both would silently demote a correct repo *and* fire the mismatch
 * warning at a user who has nothing to fix. `realpath` needs the path to exist,
 * so a candidate that doesn't yet falls back to `resolve` — the pure comparison,
 * which is also what the injectable {@link canonicalise} seam lets tests use.
 */
export type CwdChoice = {
  /** The directory the session should run in, as supplied (possibly `~`-form). */
  cwd: string;
  /** Which candidate won — lets the caller log *why* a session landed where it did. */
  source: 'repo' | 'project' | 'fallback' | 'gateway';
  /**
   * True when a repo path was present but lost to the project work directory
   * because it resolves outside it. The surviving half of the Phase 84 D
   * mismatch, and the signal Theme C needs.
   */
  repoOutsideProject?: boolean;
};

export function pickSessionCwd(opts: {
  projectWorkDir?: string | null;
  repoPath?: string | null;
  fallback?: string | null;
  gatewayCwd: string;
  /** Injectable home directory for `~` expansion during containment checks. */
  home?: string;
  /**
   * Injectable path canonicaliser, for tests that want the comparison to stay
   * pure. Defaults to {@link canonicalPath} (realpath, falling back to resolve).
   */
  canonicalise?: (path: string) => string;
}): CwdChoice {
  const projectWorkDir = nonEmpty(opts.projectWorkDir);
  const repoPath = nonEmpty(opts.repoPath);

  if (repoPath && projectWorkDir) {
    return isWithin(repoPath, projectWorkDir, opts.home, opts.canonicalise)
      ? { cwd: repoPath, source: 'repo' }
      : { cwd: projectWorkDir, source: 'project', repoOutsideProject: true };
  }
  if (repoPath) return { cwd: repoPath, source: 'repo' };
  if (projectWorkDir) return { cwd: projectWorkDir, source: 'project' };

  const fallback = nonEmpty(opts.fallback);
  if (fallback) return { cwd: fallback, source: 'fallback' };
  return { cwd: opts.gatewayCwd, source: 'gateway' };
}

/** Is `child` the same directory as `parent`, or nested inside it? */
function isWithin(
  child: string,
  parent: string,
  home?: string,
  canonicalise: (path: string) => string = canonicalPath,
): boolean {
  const rel = relative(
    canonicalise(expandTilde(parent, home)),
    canonicalise(expandTilde(child, home)),
  );
  // `rel === ''` is the same directory. Otherwise it escapes iff it *is* `..` or
  // starts with `../` — testing `startsWith('..')` alone would wrongly reject a
  // legitimate child named e.g. `..cache`.
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/**
 * A path in comparable form: `realpath` when it exists (canonicalises case on a
 * case-insensitive volume and follows symlinks), else a plain `resolve`.
 */
function canonicalPath(path: string): string {
  const absolute = resolve(path);
  try {
    return realpathSync.native(absolute);
  } catch {
    // Doesn't exist (yet) — a lexical comparison is the best available.
    return absolute;
  }
}

function nonEmpty(value: string | null | undefined): string | undefined {
  return value ? value : undefined;
}
