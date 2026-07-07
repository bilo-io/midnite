import { describe, expect, it } from 'vitest';
import {
  CreateMediaBodySchema,
  MediaSchema,
  UpdateMediaBodySchema,
  isSafeMediaFilePath,
} from './media.js';

const baseMedia = {
  id: 'm1',
  type: 'image' as const,
  title: 'A render',
  filePath: '/uploads/m1.png',
  mimeType: 'image/png',
  fileSize: 1024,
  tags: ['art'],
  createdAt: '2026-06-20T00:00:00.000Z',
  updatedAt: '2026-06-20T00:00:00.000Z',
};

describe('MediaSchema', () => {
  it('round-trips a minimal image', () => {
    expect(MediaSchema.parse(baseMedia)).toEqual(baseMedia);
  });

  it('rejects an unknown media type', () => {
    expect(MediaSchema.safeParse({ ...baseMedia, type: 'gif' }).success).toBe(false);
  });

  it('rejects a non-positive width', () => {
    expect(MediaSchema.safeParse({ ...baseMedia, width: 0 }).success).toBe(false);
  });
});

describe('CreateMediaBodySchema', () => {
  it('applies defaults for filePath/mimeType/fileSize/tags', () => {
    const parsed = CreateMediaBodySchema.parse({ type: 'video', title: 'Clip' });
    expect(parsed).toMatchObject({
      filePath: '',
      mimeType: 'application/octet-stream',
      fileSize: 0,
      tags: [],
    });
  });

  it('trims and rejects a blank title', () => {
    expect(CreateMediaBodySchema.safeParse({ type: 'audio', title: '   ' }).success).toBe(false);
  });

  it('rejects a traversal or absolute filePath (arbitrary-file-read guard)', () => {
    for (const filePath of ['/etc/passwd', '../../secrets.txt', 'a/../../b', 'C:\\win.ini', '\\etc']) {
      expect(CreateMediaBodySchema.safeParse({ type: 'image', title: 'x', filePath }).success).toBe(
        false,
      );
    }
  });

  it('accepts a normal relative filePath', () => {
    expect(
      CreateMediaBodySchema.safeParse({ type: 'image', title: 'x', filePath: 'img/pic.png' })
        .success,
    ).toBe(true);
  });
});

describe('UpdateMediaBodySchema', () => {
  it('allows nullable projectId to re-scope to none', () => {
    expect(UpdateMediaBodySchema.parse({ projectId: null }).projectId).toBeNull();
  });

  it('accepts an empty patch', () => {
    expect(UpdateMediaBodySchema.parse({})).toEqual({});
  });

  it('rejects a traversal filePath in a patch', () => {
    expect(UpdateMediaBodySchema.safeParse({ filePath: '../../etc/passwd' }).success).toBe(false);
  });
});

describe('isSafeMediaFilePath', () => {
  it('allows empty and normal relative paths', () => {
    expect(isSafeMediaFilePath('')).toBe(true);
    expect(isSafeMediaFilePath('img/pic.png')).toBe(true);
    expect(isSafeMediaFilePath('a/b/c.mp4')).toBe(true);
  });

  it('rejects absolute, traversal, and NUL-byte paths', () => {
    expect(isSafeMediaFilePath('/etc/passwd')).toBe(false);
    expect(isSafeMediaFilePath('\\\\server\\share')).toBe(false);
    expect(isSafeMediaFilePath('C:\\Windows\\win.ini')).toBe(false);
    expect(isSafeMediaFilePath('../secret')).toBe(false);
    expect(isSafeMediaFilePath('a/../../b')).toBe(false);
    expect(isSafeMediaFilePath('a\0b')).toBe(false);
  });
});
