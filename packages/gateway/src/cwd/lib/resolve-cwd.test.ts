import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CwdChoice, pickSessionCwd } from './resolve-cwd';

const GATEWAY = '/srv/midnite';
const HOME = '/home/nova';

/**
 * The Phase 84 Theme D precedence matrix. Phase 13 B3 pinned the *opposite*
 * order (project workDir beat the repo unconditionally); those cases are
 * deliberately rewritten here — see the docblock on `resolve-cwd.ts`.
 */
const MATRIX: Array<{
  name: string;
  opts: Parameters<typeof pickSessionCwd>[0];
  expected: CwdChoice;
}> = [
  {
    name: 'project + repo inside it → the repo wins (the Phase 84 D fix)',
    opts: {
      projectWorkDir: '~/Dev/midnite',
      repoPath: '~/Dev/midnite/packages/gateway',
      fallback: '~/fallback',
      gatewayCwd: GATEWAY,
      home: HOME,
    },
    expected: { cwd: '~/Dev/midnite/packages/gateway', source: 'repo' },
  },
  {
    name: 'project + repo outside it → the project wins, flagged as a mismatch',
    opts: {
      projectWorkDir: '~/Dev/midnite',
      repoPath: '~/Dev/unrelated',
      fallback: '~/fallback',
      gatewayCwd: GATEWAY,
      home: HOME,
    },
    expected: { cwd: '~/Dev/midnite', source: 'project', repoOutsideProject: true },
  },
  {
    name: 'project only → the project work directory',
    opts: { projectWorkDir: '~/Dev/midnite', fallback: '~/fallback', gatewayCwd: GATEWAY },
    expected: { cwd: '~/Dev/midnite', source: 'project' },
  },
  {
    name: 'repo only → the repo path (no project to contain it)',
    opts: { repoPath: '~/Dev/gateway', fallback: '~/fallback', gatewayCwd: GATEWAY },
    expected: { cwd: '~/Dev/gateway', source: 'repo' },
  },
  {
    name: 'neither → the profile fallback',
    opts: { fallback: '~/fallback', gatewayCwd: GATEWAY },
    expected: { cwd: '~/fallback', source: 'fallback' },
  },
  {
    name: 'nothing at all → the gateway cwd',
    opts: { gatewayCwd: GATEWAY },
    expected: { cwd: GATEWAY, source: 'gateway' },
  },
];

describe('pickSessionCwd — cwd precedence (Phase 84 D, supersedes Phase 13 B3)', () => {
  it.each(MATRIX)('$name', ({ opts, expected }) => {
    expect(pickSessionCwd(opts)).toEqual(expected);
  });

  it('treats the project directory itself as inside the project', () => {
    expect(
      pickSessionCwd({
        projectWorkDir: '~/Dev/midnite',
        repoPath: '~/Dev/midnite',
        gatewayCwd: GATEWAY,
        home: HOME,
      }),
    ).toEqual({ cwd: '~/Dev/midnite', source: 'repo' });
  });

  it('compares expanded paths, so a `~` repo inside an absolute project still wins', () => {
    expect(
      pickSessionCwd({
        projectWorkDir: `${HOME}/Dev/midnite`,
        repoPath: '~/Dev/midnite/packages/web',
        gatewayCwd: GATEWAY,
        home: HOME,
      }),
    ).toEqual({ cwd: '~/Dev/midnite/packages/web', source: 'repo' });
  });

  it('does not treat a sibling with a shared name prefix as contained', () => {
    expect(
      pickSessionCwd({
        projectWorkDir: '~/Dev/midnite',
        repoPath: '~/Dev/midnite-wt',
        gatewayCwd: GATEWAY,
        home: HOME,
      }),
    ).toEqual({ cwd: '~/Dev/midnite', source: 'project', repoOutsideProject: true });
  });

  it('treats a child whose name merely starts with `..` as contained', () => {
    // `relative()` yields `..cache` here — testing `startsWith('..')` alone would
    // wrongly report this as an escape.
    expect(
      pickSessionCwd({
        projectWorkDir: '~/Dev/midnite',
        repoPath: '~/Dev/midnite/..cache',
        gatewayCwd: GATEWAY,
        home: HOME,
      }),
    ).toEqual({ cwd: '~/Dev/midnite/..cache', source: 'repo' });
  });

  it('is unfazed by a trailing slash on the project directory', () => {
    expect(
      pickSessionCwd({
        projectWorkDir: '~/Dev/midnite/',
        repoPath: '~/Dev/midnite/packages/web',
        gatewayCwd: GATEWAY,
        home: HOME,
      }),
    ).toEqual({ cwd: '~/Dev/midnite/packages/web', source: 'repo' });
  });

  it('honours an injected canonicaliser instead of touching the filesystem', () => {
    // Proves the seam works: a canonicaliser that folds everything to one path
    // makes any repo "contained".
    expect(
      pickSessionCwd({
        projectWorkDir: '/a',
        repoPath: '/b',
        gatewayCwd: GATEWAY,
        canonicalise: () => '/same',
      }),
    ).toEqual({ cwd: '/b', source: 'repo' });
  });

  it('treats empty/null candidates as absent and defers to the next', () => {
    expect(pickSessionCwd({ projectWorkDir: '', repoPath: '~/Dev/gateway', gatewayCwd: GATEWAY })).toEqual(
      { cwd: '~/Dev/gateway', source: 'repo' },
    );
    expect(
      pickSessionCwd({ projectWorkDir: null, repoPath: null, fallback: null, gatewayCwd: GATEWAY }),
    ).toEqual({ cwd: GATEWAY, source: 'gateway' });
  });
});

// The two things a lexical comparison gets wrong are everyday on macOS, so these
// run against real directories rather than string fixtures.
describe('pickSessionCwd — containment against a real filesystem', () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'midnite-cwd-'));
    mkdirSync(join(root, 'project', 'packages', 'web'), { recursive: true });
    mkdirSync(join(root, 'outside'), { recursive: true });
    symlinkSync(join(root, 'project', 'packages', 'web'), join(root, 'linked-web'));
  });

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('follows a symlinked repo back into the project', () => {
    // `~/.worktrees`-style symlinks are a convention in this repo; a lexical
    // compare would call the link target "outside" and demote a correct repo.
    expect(
      pickSessionCwd({
        projectWorkDir: join(root, 'project'),
        repoPath: join(root, 'linked-web'),
        gatewayCwd: GATEWAY,
      }),
    ).toEqual({ cwd: join(root, 'linked-web'), source: 'repo' });
  });

  it('matches paths that differ only in case on a case-insensitive volume', () => {
    // macOS's default APFS volume is case-insensitive, so these are one
    // directory. On a case-sensitive volume `PROJECT` genuinely does not exist,
    // and the fail-safe (project wins + a flagged mismatch) is correct there.
    const shouted = join(root, 'PROJECT');
    const choice = pickSessionCwd({
      projectWorkDir: shouted,
      repoPath: join(root, 'project', 'packages', 'web'),
      gatewayCwd: GATEWAY,
    });
    if (choice.source === 'repo') {
      expect(choice).toEqual({ cwd: join(root, 'project', 'packages', 'web'), source: 'repo' });
    } else {
      expect(choice).toEqual({ cwd: shouted, source: 'project', repoOutsideProject: true });
    }
  });

  it('still flags a genuinely unrelated real directory', () => {
    expect(
      pickSessionCwd({
        projectWorkDir: join(root, 'project'),
        repoPath: join(root, 'outside'),
        gatewayCwd: GATEWAY,
      }),
    ).toEqual({ cwd: join(root, 'project'), source: 'project', repoOutsideProject: true });
  });
});
