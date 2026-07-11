import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { DigestRepository } from './digest.repository';

// createTestDb migrates a fresh :memory: SQLite, so `digests` (0082) exists.
let db: ReturnType<typeof createTestDb>['db'];
let repo: DigestRepository;

beforeEach(() => {
  db = createTestDb().db;
  repo = new DigestRepository(db);
});

function row(id: string, createdAt: string) {
  return {
    id,
    createdAt,
    windowFrom: '2026-07-01T00:00:00.000Z',
    windowTo: '2026-07-02T00:00:00.000Z',
    digest: JSON.stringify({ id, headline: 'h' }),
    markdown: `# ${id}`,
  };
}

describe('DigestRepository (migration smoke + CRUD)', () => {
  it('inserts a digest and reads it back by id', () => {
    repo.insert(row('d1', '2026-07-02T10:00:00.000Z'));
    const got = repo.getById('d1');
    expect(got?.markdown).toBe('# d1');
    expect(got?.windowFrom).toBe('2026-07-01T00:00:00.000Z');
  });

  it('returns undefined for an unknown id', () => {
    expect(repo.getById('nope')).toBeUndefined();
  });

  it('lists recent digests most-recent-first, honouring the limit', () => {
    repo.insert(row('d1', '2026-07-01T10:00:00.000Z'));
    repo.insert(row('d2', '2026-07-03T10:00:00.000Z'));
    repo.insert(row('d3', '2026-07-02T10:00:00.000Z'));
    expect(repo.listRecent().map((r) => r.id)).toEqual(['d2', 'd3', 'd1']);
    expect(repo.listRecent(1).map((r) => r.id)).toEqual(['d2']);
  });
});
