import { describe, expect, it } from 'vitest';
import { planVersionBump, sharesLockstepMajorMinor } from './version.js';

const REPO = {
  midnite: '0.3.0',
  '@midnite/shared': '0.3.0',
  '@midnite/cli': '0.3.2',
  '@midnite/web': '0.3.1',
};

describe('planVersionBump', () => {
  it('moves ALL packages to X.(Y+1).0 on a lockstep minor', () => {
    expect(planVersionBump(REPO, { level: 'minor', changedPackages: ['@midnite/cli'] })).toEqual({
      midnite: '0.4.0',
      '@midnite/shared': '0.4.0',
      '@midnite/cli': '0.4.0',
      '@midnite/web': '0.4.0',
    });
  });

  it('moves ALL packages to (X+1).0.0 on a lockstep major', () => {
    expect(planVersionBump(REPO, { level: 'major', changedPackages: [] })).toEqual({
      midnite: '1.0.0',
      '@midnite/shared': '1.0.0',
      '@midnite/cli': '1.0.0',
      '@midnite/web': '1.0.0',
    });
  });

  it('bumps only the changed packages on a patch, leaving others unchanged', () => {
    expect(
      planVersionBump(REPO, {
        level: 'patch',
        changedPackages: ['@midnite/cli', '@midnite/web'],
      }),
    ).toEqual({
      midnite: '0.3.0',
      '@midnite/shared': '0.3.0',
      '@midnite/cli': '0.3.3',
      '@midnite/web': '0.3.2',
    });
  });

  it('ignores unknown package names in a patch change set', () => {
    expect(
      planVersionBump(REPO, { level: 'patch', changedPackages: ['@midnite/does-not-exist'] }),
    ).toEqual(REPO);
  });

  it('is idempotent on a `none` change set', () => {
    expect(planVersionBump(REPO, { level: 'none', changedPackages: [] })).toEqual(REPO);
    // returns a copy, not the same reference
    expect(planVersionBump(REPO, { level: 'none', changedPackages: [] })).not.toBe(REPO);
  });

  it('throws when the current versions are not in lockstep', () => {
    expect(() =>
      planVersionBump({ a: '0.3.0', b: '0.4.0' }, { level: 'minor', changedPackages: [] }),
    ).toThrow(/lockstep/);
  });

  it('handles an empty version map', () => {
    expect(planVersionBump({}, { level: 'minor', changedPackages: [] })).toEqual({});
  });
});

describe('sharesLockstepMajorMinor', () => {
  it('is true when every version shares one MAJOR.MINOR (patch may differ)', () => {
    expect(sharesLockstepMajorMinor(['0.3.0', '0.3.5'])).toBe(true);
  });

  it('is false when a MINOR diverges', () => {
    expect(sharesLockstepMajorMinor(['0.3.0', '0.4.0'])).toBe(false);
  });

  it('is false when a MAJOR diverges', () => {
    expect(sharesLockstepMajorMinor(['0.3.0', '1.3.0'])).toBe(false);
  });

  it('is trivially true for an empty or single-version list', () => {
    expect(sharesLockstepMajorMinor([])).toBe(true);
    expect(sharesLockstepMajorMinor(['2.7.4'])).toBe(true);
  });

  it('throws on a malformed version', () => {
    expect(() => sharesLockstepMajorMinor(['0.3', '0.3.0'])).toThrow(/invalid semver/);
  });
});
