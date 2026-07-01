import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../../test';
import { InboundSourcesRepository } from './inbound-sources.repository';
import type { InboundSourceInsert } from '../../db/schema';

let repo: InboundSourcesRepository;

beforeEach(() => {
  repo = new InboundSourcesRepository(createTestDb().db);
});

function row(id: string, overrides: Partial<InboundSourceInsert> = {}): InboundSourceInsert {
  return {
    id,
    teamId: 'team-1',
    createdBy: 'u1',
    provider: 'github',
    eventFilter: JSON.stringify({ events: ['issues.opened'] }),
    secret: 'enc',
    defaultRepo: null,
    defaultProjectId: null,
    enabled: true,
    createdAt: `2026-07-01T00:00:0${id.slice(-1)}.000Z`,
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('InboundSourcesRepository (real SQLite)', () => {
  it('insert + findById round-trip', () => {
    const inserted = repo.insert(row('1'));
    expect(inserted.provider).toBe('github');
    expect(repo.findById('1')?.id).toBe('1');
    expect(repo.findById('missing')).toBeUndefined();
  });

  it('list is team-scoped, newest-first', () => {
    repo.insert(row('1', { teamId: 'team-1' }));
    repo.insert(row('2', { teamId: 'team-1' }));
    repo.insert(row('3', { teamId: 'team-2' }));
    const t1 = repo.list('team-1');
    expect(t1.map((r) => r.id)).toEqual(['2', '1']);
    expect(repo.list('team-2')).toHaveLength(1);
    expect(repo.list(null)).toHaveLength(0);
  });

  it('update patches fields; remove deletes', () => {
    repo.insert(row('1'));
    const updated = repo.update('1', { enabled: false, defaultRepo: 'web' });
    expect(updated?.enabled).toBe(false);
    expect(updated?.defaultRepo).toBe('web');
    repo.remove('1');
    expect(repo.findById('1')).toBeUndefined();
  });
});
