import { describe, expect, it } from 'vitest';
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

  it('treats empty/blank candidates as absent and defers to the next', () => {
    expect(pickSessionCwd({ projectWorkDir: '', repoPath: '~/Dev/gateway', gatewayCwd: GATEWAY })).toEqual(
      { cwd: '~/Dev/gateway', source: 'repo' },
    );
    expect(
      pickSessionCwd({ projectWorkDir: null, repoPath: null, fallback: null, gatewayCwd: GATEWAY }),
    ).toEqual({ cwd: GATEWAY, source: 'gateway' });
  });
});
