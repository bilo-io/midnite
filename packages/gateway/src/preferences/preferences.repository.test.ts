import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { PreferencesRepository } from './preferences.repository';

let repo: PreferencesRepository;

beforeEach(() => {
  repo = new PreferencesRepository(createTestDb().db);
});

describe('PreferencesRepository', () => {
  it('returns undefined for a user with no row', () => {
    expect(repo.find('nobody')).toBeUndefined();
  });

  it('upserts then finds the row', () => {
    repo.upsert('u1', '{"accent":"blue"}', '2026-06-30T10:00:00.000Z');
    const row = repo.find('u1');
    expect(row).toMatchObject({
      userId: 'u1',
      data: '{"accent":"blue"}',
      updatedAt: '2026-06-30T10:00:00.000Z',
    });
  });

  it('replaces data + updatedAt on a second upsert (one row per user)', () => {
    repo.upsert('u1', '{"accent":"blue"}', '2026-06-30T10:00:00.000Z');
    const updated = repo.upsert('u1', '{"accent":"rose"}', '2026-06-30T11:00:00.000Z');
    expect(updated.data).toBe('{"accent":"rose"}');
    expect(updated.updatedAt).toBe('2026-06-30T11:00:00.000Z');
    expect(repo.find('u1')?.data).toBe('{"accent":"rose"}');
  });
});
