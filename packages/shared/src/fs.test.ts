import { describe, expect, it } from 'vitest';
import { BrowseDirResponseSchema, DirEntrySchema } from './fs.js';

describe('DirEntrySchema', () => {
  it('round-trips a directory entry', () => {
    const entry = { name: 'Dev', path: '~/Dev' };
    expect(DirEntrySchema.parse(entry)).toEqual(entry);
  });

  it('rejects a missing path', () => {
    expect(DirEntrySchema.safeParse({ name: 'Dev' }).success).toBe(false);
  });
});

describe('BrowseDirResponseSchema', () => {
  it('round-trips a listing with entries', () => {
    const res = {
      path: '~/Dev',
      parent: '~',
      entries: [{ name: 'midnite', path: '~/Dev/midnite' }],
    };
    expect(BrowseDirResponseSchema.parse(res)).toEqual(res);
  });

  it('allows a null parent at the filesystem root', () => {
    const res = { path: '/', parent: null, entries: [] };
    expect(BrowseDirResponseSchema.parse(res).parent).toBeNull();
  });
});
