import { describe, expect, it } from 'vitest';
import { PathNotAllowedError, assertPathAllowed, isPathAllowed, resolveRoots } from './path-jail';

describe('resolveRoots', () => {
  it('expands `~` so a user-authored root works', () => {
    expect(resolveRoots(['~/Dev'], '/Users/ada')).toEqual(['/Users/ada/Dev']);
  });

  it('resolves a relative root to an absolute path', () => {
    expect(resolveRoots(['/srv/./work/../work'], '/home/ada')).toEqual(['/srv/work']);
  });

  it('drops blank entries so a stray "" cannot become a root', () => {
    // `''` resolves to the process cwd, which would silently jail the picker to
    // wherever the gateway happens to have been started from.
    expect(resolveRoots(['', '   ', '/srv/work'], '/home/ada')).toEqual(['/srv/work']);
  });
});

describe('isPathAllowed', () => {
  const roots = ['/srv/work'];

  it('allows everything when no roots are configured — the default', () => {
    expect(isPathAllowed('/etc', [])).toBe(true);
    expect(isPathAllowed('/', [])).toBe(true);
  });

  it('allows the root itself so the picker can open on it', () => {
    expect(isPathAllowed('/srv/work', roots)).toBe(true);
  });

  it('allows a descendant', () => {
    expect(isPathAllowed('/srv/work/project/src', roots)).toBe(true);
  });

  it('refuses a sibling that merely shares the root as a string prefix', () => {
    // The bug a bare `startsWith` would ship: `/srv/work-evil` is NOT in the jail.
    expect(isPathAllowed('/srv/work-evil', roots)).toBe(false);
    expect(isPathAllowed('/srv/workshop/secrets', roots)).toBe(false);
  });

  it('refuses an unrelated path and the roots parent', () => {
    expect(isPathAllowed('/etc', roots)).toBe(false);
    expect(isPathAllowed('/srv', roots)).toBe(false);
  });

  it('accepts a path under any one of several roots', () => {
    const many = ['/srv/work', '/opt/code'];
    expect(isPathAllowed('/opt/code/thing', many)).toBe(true);
    expect(isPathAllowed('/var/tmp', many)).toBe(false);
  });

  it('handles a root written with a trailing separator', () => {
    expect(isPathAllowed('/srv/work/x', ['/srv/work/'])).toBe(true);
    expect(isPathAllowed('/srv/work-evil', ['/srv/work/'])).toBe(false);
  });
});

describe('assertPathAllowed', () => {
  it('throws PathNotAllowedError naming the path', () => {
    expect(() => assertPathAllowed('/etc', ['/srv/work'])).toThrow(PathNotAllowedError);
    expect(() => assertPathAllowed('/etc', ['/srv/work'])).toThrow(/\/etc/);
  });

  it('is a no-op for an allowed path', () => {
    expect(() => assertPathAllowed('/srv/work/x', ['/srv/work'])).not.toThrow();
  });
});
