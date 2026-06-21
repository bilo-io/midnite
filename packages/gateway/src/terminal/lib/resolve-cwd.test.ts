import { describe, expect, it } from 'vitest';
import { pickSessionCwd } from './resolve-cwd';

const GATEWAY = '/srv/midnite';

describe('pickSessionCwd — cwd precedence (Phase 13 B3)', () => {
  it('project workDir wins over the repo', () => {
    expect(
      pickSessionCwd({
        projectWorkDir: '~/Dev/web',
        repoPath: '~/Dev/gateway',
        fallback: '~/fallback',
        gatewayCwd: GATEWAY,
      }),
    ).toBe('~/Dev/web');
  });

  it('uses the repo when there is no project workDir', () => {
    expect(
      pickSessionCwd({
        projectWorkDir: undefined,
        repoPath: '~/Dev/gateway',
        fallback: '~/fallback',
        gatewayCwd: GATEWAY,
      }),
    ).toBe('~/Dev/gateway');
  });

  it('falls back to the profile default when unassigned (no project, no repo)', () => {
    expect(
      pickSessionCwd({
        projectWorkDir: undefined,
        repoPath: undefined,
        fallback: '~/fallback',
        gatewayCwd: GATEWAY,
      }),
    ).toBe('~/fallback');
  });

  it('falls back to the gateway cwd when nothing else is set', () => {
    expect(
      pickSessionCwd({
        projectWorkDir: undefined,
        repoPath: undefined,
        fallback: undefined,
        gatewayCwd: GATEWAY,
      }),
    ).toBe(GATEWAY);
  });

  it('treats empty/blank candidates as absent and defers to the next', () => {
    expect(
      pickSessionCwd({ projectWorkDir: '', repoPath: '~/Dev/gateway', gatewayCwd: GATEWAY }),
    ).toBe('~/Dev/gateway');
    expect(
      pickSessionCwd({ projectWorkDir: null, repoPath: null, fallback: null, gatewayCwd: GATEWAY }),
    ).toBe(GATEWAY);
  });
});
