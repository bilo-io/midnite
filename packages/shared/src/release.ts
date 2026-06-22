// Conventional-commit categorisation for the release flow. Pure — no fs, no
// process — this is the reference implementation the `/release-prep` skill applies
// when it turns the commits since the last release into a `ChangeSet` for
// `planVersionBump`. Keeping the decision rules here (and unit-tested) instead of
// buried in the skill prose means docs/RELEASING.md, the skill, and the bump math
// can't drift. See version.ts for the bump math these feed.

import type { BumpLevel, ChangeSet } from './version.js';

/** A single conventional commit, parsed from its message. */
export type ConventionalCommit = {
  /** Lower-cased type token, e.g. `feat`, `fix`. May be an unrecognised word. */
  type: string;
  /** Lower-cased scope inside `type(scope):`, or `null` when absent. */
  scope: string | null;
  /** True for a `type!:` marker or a `BREAKING CHANGE` footer. */
  breaking: boolean;
  /** Subject text after the `:`. */
  description: string;
  /** Whether `type` is one of the recognised conventional-commit types. */
  known: boolean;
};

/** The conventional-commit types midnite uses (CLAUDE.md house style + usual extras). */
export const KNOWN_COMMIT_TYPES = [
  'feat',
  'fix',
  'docs',
  'chore',
  'refactor',
  'test',
  'perf',
  'build',
  'ci',
  'style',
  'revert',
] as const;

export type KnownCommitType = (typeof KNOWN_COMMIT_TYPES)[number];

// `type(scope)!: description` — the conventional-commit subject grammar.
const SUBJECT_RE = /^([a-z]+)(?:\(([^)]+)\))?(!)?:[ \t]*(.*)$/i;
// A `BREAKING CHANGE:` / `BREAKING-CHANGE:` footer anywhere in the body.
const BREAKING_FOOTER_RE = /(^|\n)[ \t]*BREAKING[ -]CHANGE[ \t]*:/i;

/**
 * Parse a commit message into a {@link ConventionalCommit}, or `null` when the
 * subject doesn't fit the `type: subject` / `type(scope): subject` shape. The
 * first non-empty line is the subject; an unrecognised `type` parses but is
 * flagged `known: false` (the skill surfaces those for the human). `breaking` is
 * set by a `!` marker on the subject or a `BREAKING CHANGE` footer in the body.
 */
export function parseConventionalCommit(message: string): ConventionalCommit | null {
  const subject = message.split('\n').find((line) => line.trim().length > 0)?.trim();
  if (!subject) return null;

  const match = SUBJECT_RE.exec(subject);
  if (!match) return null;

  const [, rawType = '', rawScope, bang, description = ''] = match;
  const type = rawType.toLowerCase();
  return {
    type,
    scope: rawScope ? rawScope.toLowerCase() : null,
    breaking: Boolean(bang) || BREAKING_FOOTER_RE.test(message),
    description: description.trim(),
    known: (KNOWN_COMMIT_TYPES as readonly string[]).includes(type),
  };
}

/**
 * The strongest bump level implied by a set of commits (Phase 29 Decision §2):
 * any `BREAKING CHANGE` → `major`; else any `feat` → `minor`; else any `fix` →
 * `patch`; else `none` (docs/chore/refactor/test/etc. don't trigger a release).
 */
export function bumpLevelFromCommits(commits: ConventionalCommit[]): BumpLevel {
  if (commits.some((c) => c.breaking)) return 'major';
  if (commits.some((c) => c.type === 'feat')) return 'minor';
  if (commits.some((c) => c.type === 'fix')) return 'patch';
  return 'none';
}

/** A Keep a Changelog section heading. */
export type ChangelogGroup = 'Added' | 'Changed' | 'Fixed' | 'Removed';

// Which Keep a Changelog section a commit type lands under. Types absent here
// (docs/chore/test/build/ci/style + anything unrecognised) are not user-facing
// and are omitted from the changelog.
const GROUP_BY_TYPE: Record<string, ChangelogGroup> = {
  feat: 'Added',
  fix: 'Fixed',
  perf: 'Changed',
  refactor: 'Changed',
  revert: 'Removed',
};

/**
 * The changelog section a commit belongs under, or `null` when it isn't
 * user-facing (and so shouldn't appear in the curated notes).
 *
 * Note `revert` is changelog-visible (`Removed`) but does not, on its own, trigger
 * a release ({@link bumpLevelFromCommits} fires only on breaking/feat/fix). That's
 * deliberate: a revert-only range nets to no release, but a revert alongside other
 * releasable changes is documented under Removed.
 */
export function changelogGroupForCommit(commit: ConventionalCommit): ChangelogGroup | null {
  return GROUP_BY_TYPE[commit.type] ?? null;
}

/**
 * Attribute changed file paths to the packages that own them. A path under a
 * package's directory belongs to that package (longest matching directory wins);
 * anything outside every package directory (root tooling, docs, CI) is attributed
 * to the root package. Returns the owning package names in `packages` order.
 *
 * `changedPackages` only scopes a `patch` release; `major`/`minor` move the whole
 * repo in lockstep regardless (see {@link planVersionBump}).
 */
export function packagesForChangedPaths(
  paths: string[],
  packages: { name: string; dir: string }[],
): string[] {
  // Normalise dirs to a trailing-slash-free relative POSIX form; '.'/''  = root.
  const norm = packages.map((p) => ({
    name: p.name,
    dir: p.dir === '.' ? '' : p.dir.replace(/^\.?\/+/, '').replace(/\/+$/, ''),
  }));
  const root = norm.find((p) => p.dir === '');

  const owners = new Set<string>();
  for (const raw of paths) {
    const file = raw.replace(/^\.?\/+/, '');
    let best: { name: string; dir: string } | null = null;
    for (const p of norm) {
      if (p.dir === '') continue; // root handled as fallback below
      if (file === p.dir || file.startsWith(`${p.dir}/`)) {
        if (!best || p.dir.length > best.dir.length) best = p;
      }
    }
    const owner = best ?? root;
    if (owner) owners.add(owner.name);
  }
  return norm.filter((p) => owners.has(p.name)).map((p) => p.name);
}

/**
 * Bridge from parsed commits + changed packages to the {@link ChangeSet} that
 * {@link planVersionBump} consumes: the strongest bump level across the commits,
 * scoped to the packages whose files changed.
 */
export function changeSetFromCommits(
  commits: ConventionalCommit[],
  changedPackages: string[],
): ChangeSet {
  return { level: bumpLevelFromCommits(commits), changedPackages };
}

// --- Finalising a release (the /release-complete half) ------------------------

/** A parsed `## [version] - date` section of a Keep a Changelog file. */
export type ChangelogSection = {
  /** The version in the heading, e.g. `0.1.0`. */
  version: string;
  /** The `YYYY-MM-DD` date in the heading, or `null` when undated (e.g. Unreleased). */
  date: string | null;
  /** The section body — everything up to the next `##` heading or the link refs, trimmed. */
  body: string;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Pull a single version's section out of a CHANGELOG.md (Keep a Changelog format),
 * so `/release-complete` can feed it to `gh release create --notes` and check the
 * section is present + dated as a precondition. Returns `null` when there's no
 * `## [version]` heading. `date` is `null` for an undated heading (e.g. while still
 * `## [Unreleased]`), which the skill treats as "not ready to finalise".
 */
export function extractChangelogSection(
  changelog: string,
  version: string,
): ChangelogSection | null {
  const lines = changelog.split('\n');
  const headingRe = new RegExp(
    `^##\\s+\\[${escapeRegExp(version)}\\](?:\\s+-\\s+(\\d{4}-\\d{2}-\\d{2}))?\\s*$`,
  );

  let start = -1;
  let date: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const match = headingRe.exec(lines[i] ?? '');
    if (match) {
      start = i;
      date = match[1] ?? null;
      break;
    }
  }
  if (start === -1) return null;

  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (/^##\s/.test(line)) break; // next section
    if (/^\[[^\]]+\]:\s/.test(line)) break; // the compare/tag link-ref block
    body.push(line);
  }
  return { version, date, body: body.join('\n').trim() };
}

/**
 * The git tags a release cuts, per the scheme (Decision §3 / docs/RELEASING.md):
 *
 * - **lockstep minor/major** — the shared MAJOR.MINOR advanced and every package
 *   moved to the new `X.Y.0` → a single repo tag `vX.Y.Z`.
 * - **independent patch** — MAJOR.MINOR unchanged, only some packages' patches
 *   bumped → a scoped tag `‹pkg›@X.Y.Z` per bumped package.
 *
 * Returns `[]` when nothing changed. `previous`/`next` are the version maps either
 * side of {@link planVersionBump}.
 */
export function planReleaseTags(
  previous: Record<string, string>,
  next: Record<string, string>,
): string[] {
  const changed = Object.keys(next).filter((name) => next[name] !== previous[name]);
  if (changed.length === 0) return [];

  const majorMinor = (version: string): string => version.split('.').slice(0, 2).join('.');
  const prevFirst = Object.values(previous)[0];
  const prevPrefix = prevFirst === undefined ? null : majorMinor(prevFirst);

  const changedNext = changed.map((name) => ({ name, version: next[name] ?? '' }));
  const lockstepBump =
    prevPrefix !== null && changedNext.every((entry) => majorMinor(entry.version) !== prevPrefix);

  if (lockstepBump) {
    const shared = changedNext[0]?.version ?? '';
    return [`v${shared}`];
  }
  return changedNext.map((entry) => `${entry.name}@${entry.version}`);
}

/** Extract `X.Y.Z` from a `release/vX.Y.Z` branch name, or `null` if it isn't one. */
export function versionFromReleaseBranch(branch: string): string | null {
  const match = /^release\/v(\d+\.\d+\.\d+)$/.exec(branch);
  return match ? (match[1] ?? null) : null;
}
