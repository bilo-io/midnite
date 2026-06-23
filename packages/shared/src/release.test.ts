import { describe, expect, it } from 'vitest';

import {
  bumpLevelFromCommits,
  changeSetFromCommits,
  changelogGroupForCommit,
  extractChangelogSection,
  packagesForChangedPaths,
  parseConventionalCommit,
  planReleaseTags,
  versionFromReleaseBranch,
  type ConventionalCommit,
} from './release.js';

/** Build a commit quickly for the level/group tests. */
const commit = (over: Partial<ConventionalCommit> & { type: string }): ConventionalCommit => ({
  scope: null,
  breaking: false,
  description: '',
  known: true,
  ...over,
});

describe('parseConventionalCommit', () => {
  it('parses type, scope, and description', () => {
    expect(parseConventionalCommit('feat(gateway): add scheduler tick metric')).toEqual({
      type: 'feat',
      scope: 'gateway',
      breaking: false,
      description: 'add scheduler tick metric',
      known: true,
    });
  });

  it('parses a scopeless commit', () => {
    expect(parseConventionalCommit('fix: stop double-counting slots')).toMatchObject({
      type: 'fix',
      scope: null,
      description: 'stop double-counting slots',
    });
  });

  it('flags a `!` breaking marker', () => {
    expect(parseConventionalCommit('feat(api)!: drop the legacy field')).toMatchObject({
      type: 'feat',
      breaking: true,
    });
  });

  it('flags a BREAKING CHANGE footer in the body', () => {
    const msg = 'refactor(shared): reshape config\n\nBREAKING CHANGE: `repos` is now an array';
    expect(parseConventionalCommit(msg)).toMatchObject({ type: 'refactor', breaking: true });
  });

  it('flags the hyphenated BREAKING-CHANGE footer variant', () => {
    const msg = 'fix(cli): retire the flag\n\nBREAKING-CHANGE: --legacy is gone';
    expect(parseConventionalCommit(msg)).toMatchObject({ type: 'fix', breaking: true });
  });

  it('does not treat a mid-line "breaking change" mention as breaking', () => {
    const msg = 'fix(web): note this is not a breaking change in the body';
    expect(parseConventionalCommit(msg)).toMatchObject({ type: 'fix', breaking: false });
  });

  it('lower-cases the type and scope', () => {
    expect(parseConventionalCommit('FEAT(Web): X')).toMatchObject({ type: 'feat', scope: 'web' });
  });

  it('marks an unrecognised type as not known', () => {
    expect(parseConventionalCommit('wip: poke at things')).toMatchObject({
      type: 'wip',
      known: false,
    });
  });

  it('uses the first non-empty line as the subject', () => {
    expect(parseConventionalCommit('\n\nfeat: late subject')).toMatchObject({ type: 'feat' });
  });

  it('returns null for a non-conventional subject', () => {
    expect(parseConventionalCommit('just some words')).toBeNull();
    expect(parseConventionalCommit('Merge branch main')).toBeNull();
    expect(parseConventionalCommit('')).toBeNull();
  });
});

describe('bumpLevelFromCommits', () => {
  it('is `major` when any commit is breaking, beating feat/fix', () => {
    expect(
      bumpLevelFromCommits([
        commit({ type: 'feat' }),
        commit({ type: 'fix', breaking: true }),
      ]),
    ).toBe('major');
  });

  it('is `major` for a breaking feat (the `!` case) over a plain feat', () => {
    expect(
      bumpLevelFromCommits([commit({ type: 'feat' }), commit({ type: 'feat', breaking: true })]),
    ).toBe('major');
  });

  it('is `minor` when a feat is present without a breaking change', () => {
    expect(bumpLevelFromCommits([commit({ type: 'fix' }), commit({ type: 'feat' })])).toBe('minor');
  });

  it('is `none` for a revert-only range (revert does not trigger a release)', () => {
    expect(bumpLevelFromCommits([commit({ type: 'revert' })])).toBe('none');
  });

  it('is `patch` for fix-only', () => {
    expect(bumpLevelFromCommits([commit({ type: 'fix' }), commit({ type: 'docs' })])).toBe('patch');
  });

  it('is `none` for docs/chore/refactor/test only', () => {
    expect(
      bumpLevelFromCommits([
        commit({ type: 'docs' }),
        commit({ type: 'chore' }),
        commit({ type: 'refactor' }),
        commit({ type: 'test' }),
      ]),
    ).toBe('none');
  });

  it('is `none` for an empty set', () => {
    expect(bumpLevelFromCommits([])).toBe('none');
  });
});

describe('changelogGroupForCommit', () => {
  it('maps feat→Added, fix→Fixed, perf/refactor→Changed, revert→Removed', () => {
    expect(changelogGroupForCommit(commit({ type: 'feat' }))).toBe('Added');
    expect(changelogGroupForCommit(commit({ type: 'fix' }))).toBe('Fixed');
    expect(changelogGroupForCommit(commit({ type: 'perf' }))).toBe('Changed');
    expect(changelogGroupForCommit(commit({ type: 'refactor' }))).toBe('Changed');
    expect(changelogGroupForCommit(commit({ type: 'revert' }))).toBe('Removed');
  });

  it('returns null for non-user-facing or unknown types', () => {
    for (const type of ['docs', 'chore', 'test', 'build', 'ci', 'style', 'wip']) {
      expect(changelogGroupForCommit(commit({ type }))).toBeNull();
    }
  });
});

describe('packagesForChangedPaths', () => {
  const packages = [
    { name: 'midnite', dir: '.' },
    { name: '@midnite/shared', dir: 'packages/shared' },
    { name: '@midnite/cli', dir: 'packages/cli' },
    { name: '@midnite/web', dir: 'packages/web' },
  ];

  it('attributes a path to the package whose directory owns it', () => {
    expect(packagesForChangedPaths(['packages/cli/src/add.ts'], packages)).toEqual(['@midnite/cli']);
  });

  it('attributes root-level files to the root package', () => {
    expect(packagesForChangedPaths(['scripts/version-check.mjs', 'README.md'], packages)).toEqual([
      'midnite',
    ]);
  });

  it('returns multiple owners in `packages` order, deduped', () => {
    expect(
      packagesForChangedPaths(
        ['packages/web/app/page.tsx', 'packages/shared/src/task.ts', 'packages/web/lib/x.ts'],
        packages,
      ),
    ).toEqual(['@midnite/shared', '@midnite/web']);
  });

  it('picks the longest matching directory when dirs nest', () => {
    const nested = [
      { name: 'root', dir: '.' },
      { name: 'pkg', dir: 'packages' },
      { name: 'cli', dir: 'packages/cli' },
    ];
    expect(packagesForChangedPaths(['packages/cli/src/x.ts'], nested)).toEqual(['cli']);
  });

  it('tolerates leading ./ on paths', () => {
    expect(packagesForChangedPaths(['./packages/shared/src/x.ts'], packages)).toEqual([
      '@midnite/shared',
    ]);
  });

  it('matches a path equal to the package directory itself', () => {
    expect(packagesForChangedPaths(['packages/cli'], packages)).toEqual(['@midnite/cli']);
  });

  it('drops an unattributable path when there is no root package', () => {
    const noRoot = [{ name: '@midnite/cli', dir: 'packages/cli' }];
    expect(packagesForChangedPaths(['docs/RELEASING.md'], noRoot)).toEqual([]);
  });

  it('returns [] for no changed paths', () => {
    expect(packagesForChangedPaths([], packages)).toEqual([]);
  });
});

describe('changeSetFromCommits', () => {
  it('combines the bump level with the changed packages', () => {
    expect(
      changeSetFromCommits([commit({ type: 'fix' })], ['@midnite/cli']),
    ).toEqual({ level: 'patch', changedPackages: ['@midnite/cli'] });
  });
});

const CHANGELOG = `# Changelog

## [Unreleased]

### Added

- something in flight

## [0.1.0] - 2026-06-22

### Added

- A real feature.

### Fixed

- A real bug.

## [0.0.0] - 2026-06-18

### Added

- Initial scaffold.

[Unreleased]: https://example.com/compare/v0.1.0...HEAD
[0.1.0]: https://example.com/releases/tag/v0.1.0
[0.0.0]: https://example.com/releases/tag/v0.0.0
`;

describe('extractChangelogSection', () => {
  it('returns the dated section body for a released version', () => {
    const section = extractChangelogSection(CHANGELOG, '0.1.0');
    expect(section).toMatchObject({ version: '0.1.0', date: '2026-06-22' });
    expect(section?.body).toBe('### Added\n\n- A real feature.\n\n### Fixed\n\n- A real bug.');
  });

  it('stops at the next section heading (no bleed into older versions)', () => {
    expect(extractChangelogSection(CHANGELOG, '0.1.0')?.body).not.toContain('Initial scaffold');
  });

  it('does not include the link-ref block in the body', () => {
    expect(extractChangelogSection(CHANGELOG, '0.0.0')?.body).toBe('### Added\n\n- Initial scaffold.');
  });

  it('reports an undated section (e.g. Unreleased) with date null', () => {
    expect(extractChangelogSection(CHANGELOG, 'Unreleased')).toMatchObject({ date: null });
  });

  it('returns null when the version has no section', () => {
    expect(extractChangelogSection(CHANGELOG, '9.9.9')).toBeNull();
  });

  it('treats the version dots literally (no regex wildcard match)', () => {
    // `0x1x0` must not match the `[0.1.0]` heading via a dot-as-any-char regex.
    expect(extractChangelogSection(CHANGELOG, '0x1x0')).toBeNull();
  });

  it('returns an empty body for a heading with no content (e.g. at EOF)', () => {
    const section = extractChangelogSection('# Changelog\n\n## [0.2.0] - 2026-07-01', '0.2.0');
    expect(section).toMatchObject({ version: '0.2.0', date: '2026-07-01', body: '' });
  });
});

describe('planReleaseTags', () => {
  const repo = {
    midnite: '0.1.0',
    '@midnite/shared': '0.1.0',
    '@midnite/cli': '0.1.0',
  };

  it('cuts a single lockstep tag when a minor moves every package', () => {
    const next = { midnite: '0.2.0', '@midnite/shared': '0.2.0', '@midnite/cli': '0.2.0' };
    expect(planReleaseTags(repo, next)).toEqual(['v0.2.0']);
  });

  it('cuts a single lockstep tag for a major', () => {
    const next = { midnite: '1.0.0', '@midnite/shared': '1.0.0', '@midnite/cli': '1.0.0' };
    expect(planReleaseTags(repo, next)).toEqual(['v1.0.0']);
  });

  it('cuts scoped tags per changed package on a patch (MAJOR.MINOR unchanged)', () => {
    const next = { midnite: '0.1.0', '@midnite/shared': '0.1.0', '@midnite/cli': '0.1.1' };
    expect(planReleaseTags(repo, next)).toEqual(['@midnite/cli@0.1.1']);
  });

  it('scopes the root package patch as midnite@X.Y.Z', () => {
    const next = { midnite: '0.1.1', '@midnite/shared': '0.1.0', '@midnite/cli': '0.1.0' };
    expect(planReleaseTags(repo, next)).toEqual(['midnite@0.1.1']);
  });

  it('cuts a single lockstep tag for the first release (no prior versions)', () => {
    const next = { midnite: '0.1.0', '@midnite/shared': '0.1.0', '@midnite/cli': '0.1.0' };
    expect(planReleaseTags({}, next)).toEqual(['v0.1.0']);
  });

  it('returns [] when nothing changed', () => {
    expect(planReleaseTags(repo, { ...repo })).toEqual([]);
  });

  it('throws when the previous versions are not in lockstep', () => {
    const skewed = { a: '0.2.0', b: '0.1.0' };
    const next = { a: '0.2.0', b: '0.1.1' };
    expect(() => planReleaseTags(skewed, next)).toThrow(/lockstep/);
  });
});

describe('versionFromReleaseBranch', () => {
  it('extracts the version from a release/vX.Y.Z branch', () => {
    expect(versionFromReleaseBranch('release/v0.1.0')).toBe('0.1.0');
  });

  it('returns null for a non-release branch', () => {
    expect(versionFromReleaseBranch('feature/x')).toBeNull();
    expect(versionFromReleaseBranch('release/0.1.0')).toBeNull();
    expect(versionFromReleaseBranch('release/v0.1')).toBeNull();
  });
});
