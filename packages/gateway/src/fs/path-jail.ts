import { resolve, sep } from 'node:path';

import { expandTilde } from './path-tilde';

/**
 * Optional confinement for the directory picker (`gateway.fs.allowedRoots`).
 *
 * The picker navigates the gateway host's real filesystem, so unrestricted is the
 * right default for a local single-user install. When an operator shares a gateway
 * they can name the roots it may touch, and everything else is refused.
 *
 * **What this is not:** a sandbox. The check is textual, on resolved absolute
 * paths — a symlink *inside* an allowed root that points outside it is not
 * followed, so it still resolves to an in-root path and passes. Closing that would
 * mean `realpath`-ing every candidate, which `createDir` can't do for a path that
 * doesn't exist yet. Treat `allowedRoots` as a deployment guardrail against
 * accidental and casual access, not as a boundary that contains a hostile caller
 * who can already plant symlinks on the host.
 */

/** Refused because the resolved path falls outside every configured root. */
export class PathNotAllowedError extends Error {
  constructor(path: string) {
    super(`path is outside the directories this gateway is allowed to browse: ${path}`);
    this.name = 'PathNotAllowedError';
  }
}

/**
 * Normalise configured roots to absolute paths once, at construction. `~` is
 * expanded (roots are user-authored config, so `~/Dev` must work) and blank
 * entries are dropped so a stray `""` can't become a root that matches nothing.
 */
export function resolveRoots(roots: readonly string[], home: string): string[] {
  return roots
    .map((r) => r.trim())
    .filter((r) => r.length > 0)
    .map((r) => resolve(expandTilde(r, home)));
}

/**
 * Is `target` (an already-resolved absolute path) inside one of `roots`?
 *
 * An empty root list means no policy is configured ⇒ everything is allowed, which
 * keeps the default behaviour byte-for-byte. A root itself is inside itself, so
 * the picker can open on it.
 *
 * Containment compares against `root + sep`, never a bare `startsWith`: `/srv/work`
 * must not admit `/srv/work-evil`, which a prefix test would wave through.
 */
export function isPathAllowed(target: string, roots: readonly string[]): boolean {
  if (roots.length === 0) return true;
  return roots.some((root) => target === root || target.startsWith(root.endsWith(sep) ? root : root + sep));
}

/** Throw {@link PathNotAllowedError} unless `target` is inside one of `roots`. */
export function assertPathAllowed(target: string, roots: readonly string[]): void {
  if (!isPathAllowed(target, roots)) throw new PathNotAllowedError(target);
}
