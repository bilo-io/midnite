// Lockstep version-bump planning. midnite ships every package at one shared
// MAJOR.MINOR; only PATCH advances independently per package. A package version
// is therefore `‹global major›.‹global minor›.‹per-package patch›`. These helpers
// are pure bump math — no fs, no process — so the release skills and any CI check
// agree on exactly one rule. See docs/RELEASING.md / todo/phase-29-*.md.

/** The kind of bump a categorized change set implies. */
export type BumpLevel = 'major' | 'minor' | 'patch' | 'none';

/**
 * A categorized change set: the strongest bump level implied by the commits
 * since the last release, plus the packages whose files actually changed.
 *
 * `changedPackages` only matters for `patch` (it scopes the bump to the
 * affected packages). For `major`/`minor` the whole repo moves in lockstep, so
 * the list is ignored; for `none` nothing happens.
 */
export type ChangeSet = {
  level: BumpLevel;
  changedPackages: string[];
};

type SemVer = { major: number; minor: number; patch: number };

/** Parse `MAJOR.MINOR.PATCH` into numbers, throwing on a malformed version. */
function parseSemVer(version: string): SemVer {
  const parts = version.split('.');
  if (parts.length !== 3) {
    throw new Error(`invalid semver "${version}": expected MAJOR.MINOR.PATCH`);
  }
  const [major, minor, patch] = parts.map(Number) as [number, number, number];
  if (![major, minor, patch].every((n) => Number.isInteger(n) && n >= 0)) {
    throw new Error(`invalid semver "${version}": parts must be non-negative integers`);
  }
  return { major, minor, patch };
}

const formatSemVer = ({ major, minor, patch }: SemVer): string => `${major}.${minor}.${patch}`;

/**
 * True when every version shares one MAJOR.MINOR (patch may differ). The lockstep
 * invariant `version-check` asserts; an empty or single-version list is trivially
 * true. Throws on a malformed version so a bad edit surfaces loudly.
 */
export function sharesLockstepMajorMinor(versions: string[]): boolean {
  const parsed = versions.map(parseSemVer);
  const [first, ...rest] = parsed;
  if (!first) return true; // empty list is trivially in lockstep
  return rest.every((v) => v.major === first.major && v.minor === first.minor);
}

/**
 * Compute the next version for every package under the lockstep rule.
 *
 * - `major`: every package → `(major+1).0.0`
 * - `minor`: every package → `major.(minor+1).0`
 * - `patch`: only `changedPackages` bump their own patch; the rest are unchanged
 * - `none`: identical to the input (idempotent)
 *
 * The shared MAJOR.MINOR is taken from the input versions (which must already be
 * in lockstep — guarded by `version-check`). Unknown package names in
 * `changedPackages` are ignored.
 */
export function planVersionBump(
  current: Record<string, string>,
  change: ChangeSet,
): Record<string, string> {
  const entries = Object.entries(current);
  const first = entries[0];
  if (!first || change.level === 'none') {
    return { ...current };
  }

  if (!sharesLockstepMajorMinor(entries.map(([, version]) => version))) {
    throw new Error('cannot plan a bump: current versions are not in lockstep MAJOR.MINOR');
  }

  if (change.level === 'major' || change.level === 'minor') {
    const { major, minor } = parseSemVer(first[1]);
    const next =
      change.level === 'major'
        ? { major: major + 1, minor: 0, patch: 0 }
        : { major, minor: minor + 1, patch: 0 };
    const target = formatSemVer(next);
    return Object.fromEntries(entries.map(([name]) => [name, target]));
  }

  // patch: bump only the changed packages, leave the rest untouched.
  const changed = new Set(change.changedPackages);
  return Object.fromEntries(
    entries.map(([name, version]) => {
      if (!changed.has(name)) return [name, version];
      const v = parseSemVer(version);
      return [name, formatSemVer({ ...v, patch: v.patch + 1 })];
    }),
  );
}
