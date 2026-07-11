import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { DigestRepository } from './digest.repository';
import type { DigestInsert } from '../db/schema';

// createTestDb migrates a fresh :memory: SQLite, so `digests` (0082) exists.
let repo: DigestRepository;

beforeEach(() => {
  repo = new DigestRepository(createTestDb().db);
});

function row(id: string, createdAt: string): DigestInsert {
  return {
    id,
    windowFrom: '2026-07-10T08:00:00.000Z',
    windowTo: '2026-07-11T08:00:00.000Z',
    taskCount: 3,
    hasHeadline: 1,
    digest: JSON.stringify({ id, markdown: '# Digest' }),
    createdAt,
  };
}

describe('DigestRepository (migration smoke + CRUD)', () => {
  it('inserts and reads a digest by id', () => {
    repo.insert(row('d1', '2026-07-11T08:00:00.000Z'));
    expect(repo.getById('d1')?.taskCount).toBe(3);
  });

  it('returns undefined for an unknown id', () => {
    expect(repo.getById('nope')).toBeUndefined();
  });

  it('lists newest-first, honouring limit + offset', () => {
    repo.insert(row('d1', '2026-07-09T08:00:00.000Z'));
    repo.insert(row('d2', '2026-07-10T08:00:00.000Z'));
    repo.insert(row('d3', '2026-07-11T08:00:00.000Z'));
    const list = repo.list(2);
    expect(list.map((r) => r.id)).toEqual(['d3', 'd2']);
    expect(repo.list(2, 2).map((r) => r.id)).toEqual(['d1']);
  });
});
