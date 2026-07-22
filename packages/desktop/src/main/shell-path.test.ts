import { describe, expect, it } from 'vitest';

import { mergePath, parseShellPathOutput, resolveLoginShellPath } from './shell-path';

const wrap = (path: string): string => `__MIDNITE_PATH_START__${path}__MIDNITE_PATH_END__`;

describe('parseShellPathOutput', () => {
  it('extracts the PATH between the markers', () => {
    expect(parseShellPathOutput(wrap('/opt/homebrew/bin:/usr/bin'))).toBe(
      '/opt/homebrew/bin:/usr/bin',
    );
  });

  it('ignores profile noise before and after the markers', () => {
    const out = `Welcome banner\nnvm loaded\n${wrap('/usr/bin:/bin')}\ntrailing junk`;
    expect(parseShellPathOutput(out)).toBe('/usr/bin:/bin');
  });

  it('takes the last marker pair when a profile echoes the command line', () => {
    const out = `echo ${wrap('$PATH')}\n${wrap('/real/bin')}`;
    expect(parseShellPathOutput(out)).toBe('/real/bin');
  });

  it('is null when markers are missing or the PATH is empty', () => {
    expect(parseShellPathOutput('no markers here')).toBeNull();
    expect(parseShellPathOutput('__MIDNITE_PATH_START__/half-open')).toBeNull();
    expect(parseShellPathOutput(wrap(''))).toBeNull();
    expect(parseShellPathOutput(wrap('   '))).toBeNull();
  });
});

describe('mergePath', () => {
  it('puts the login-shell PATH first and appends current-only entries', () => {
    expect(mergePath('/usr/bin:/bin:/custom', '/opt/homebrew/bin:/usr/bin:/bin')).toBe(
      '/opt/homebrew/bin:/usr/bin:/bin:/custom',
    );
  });

  it('drops duplicates and empty segments from the current PATH', () => {
    expect(mergePath('/usr/bin::/usr/bin', '/usr/bin:/bin')).toBe('/usr/bin:/bin');
  });

  it('handles an unset current PATH', () => {
    expect(mergePath(undefined, '/opt/homebrew/bin')).toBe('/opt/homebrew/bin');
  });
});

describe('resolveLoginShellPath', () => {
  // Runs the real login shell — an integration check that the probe survives an
  // actual profile (banners, nvm hooks) and yields a usable PATH on this host.
  it('resolves a non-empty PATH containing the standard system dirs', () => {
    const resolved = resolveLoginShellPath();
    if (process.platform === 'win32') {
      expect(resolved).toBeNull();
      return;
    }
    expect(resolved).toBeTruthy();
    expect(resolved).toContain('/usr/bin');
  });
});
