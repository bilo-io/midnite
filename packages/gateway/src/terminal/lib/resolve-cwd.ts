/**
 * The working-directory precedence for an agent session's PTY (Phase 13 B3).
 *
 * Resolution order, highest priority first:
 *   1. the session's project work directory
 *   2. the session's repo path (resolved name → path via the repo registry)
 *   3. the global fallback working directory (set on the profile page)
 *   4. the gateway's own working directory
 *
 * `project.workDir` and `task.repo` are orthogonal axes (Phase 13 Decision §4):
 * a project work directory wins, the repo is used when there is none, and an
 * unassigned repo falls through to the fallback. The registry/project lookups
 * (and any `~` expansion) happen in the caller; this helper just encodes the
 * ordering, so it is the single place the precedence is pinned and tested.
 *
 * Each candidate is used only when non-empty (mirroring the prior inline
 * `if (workDir)` guards), so a missing earlier candidate cleanly defers to the
 * next.
 */
export function pickSessionCwd(opts: {
  projectWorkDir?: string | null;
  repoPath?: string | null;
  fallback?: string | null;
  gatewayCwd: string;
}): string {
  return (
    nonEmpty(opts.projectWorkDir) ??
    nonEmpty(opts.repoPath) ??
    nonEmpty(opts.fallback) ??
    opts.gatewayCwd
  );
}

function nonEmpty(value: string | null | undefined): string | undefined {
  return value ? value : undefined;
}
