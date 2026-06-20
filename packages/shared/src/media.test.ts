import { describe, expect, it } from 'vitest';
import {
  CreateMediaBodySchema,
  MediaSchema,
  UpdateMediaBodySchema,
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
});

describe('UpdateMediaBodySchema', () => {
  it('allows nullable projectId to re-scope to none', () => {
    expect(UpdateMediaBodySchema.parse({ projectId: null }).projectId).toBeNull();
  });

  it('accepts an empty patch', () => {
    expect(UpdateMediaBodySchema.parse({})).toEqual({});
  });
});
