import { resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveMediaPath } from './resolve-media-path';

const BASE = resolve('uploads');

describe('resolveMediaPath', () => {
  it('resolves a normal relative path inside the uploads base', () => {
    expect(resolveMediaPath('img/pic.png')).toBe(`${BASE}${sep}img${sep}pic.png`);
  });

  it('allows an absolute path that lives inside the base', () => {
    const inside = `${BASE}${sep}nested${sep}a.png`;
    expect(resolveMediaPath(inside)).toBe(inside);
  });

  it('rejects an absolute path outside the base (arbitrary file read)', () => {
    expect(resolveMediaPath('/etc/passwd')).toBeNull();
  });

  it('rejects relative `..` traversal that escapes the base', () => {
    expect(resolveMediaPath('../../../../etc/passwd')).toBeNull();
  });

  it('rejects a path that traverses out then back to a sibling of the base', () => {
    expect(resolveMediaPath('../uploads-evil/x')).toBeNull();
  });

  it('honours a custom uploads dir', () => {
    const dir = '/srv/media';
    expect(resolveMediaPath('a/b.png', dir)).toBe(`${resolve(dir)}${sep}a${sep}b.png`);
    expect(resolveMediaPath('/etc/passwd', dir)).toBeNull();
  });

  it('maps the empty path to the base itself (caller treats a missing file as 404)', () => {
    expect(resolveMediaPath('')).toBe(BASE);
  });
});
