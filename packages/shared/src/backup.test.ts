import { describe, expect, it } from 'vitest';
import { BackupRequestSchema, BackupResponseSchema } from './backup.js';

describe('BackupRequestSchema', () => {
  it('accepts an explicit target dir', () => {
    expect(BackupRequestSchema.parse({ dir: '/tmp/snap' })).toEqual({ dir: '/tmp/snap' });
  });

  it('accepts an empty request (dir optional)', () => {
    expect(BackupRequestSchema.parse({})).toEqual({});
  });
});

describe('BackupResponseSchema', () => {
  it('round-trips a completed backup with a copied uploads dir', () => {
    const res = {
      dir: '/data/backups/backup-1',
      dbPath: '/data/backups/backup-1/midnite.db',
      uploadsPath: '/data/backups/backup-1/uploads',
      dbBytes: 4096,
      at: '2026-06-20T00:00:00.000Z',
    };
    expect(BackupResponseSchema.parse(res)).toEqual(res);
  });

  it('allows a null uploadsPath when there was nothing to copy', () => {
    const res = {
      dir: '/d',
      dbPath: '/d/midnite.db',
      uploadsPath: null,
      dbBytes: 0,
      at: '2026-06-20T00:00:00.000Z',
    };
    expect(BackupResponseSchema.parse(res).uploadsPath).toBeNull();
  });

  it('rejects a negative dbBytes', () => {
    expect(
      BackupResponseSchema.safeParse({
        dir: '/d',
        dbPath: '/d/x',
        uploadsPath: null,
        dbBytes: -1,
        at: '2026-06-20T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});
