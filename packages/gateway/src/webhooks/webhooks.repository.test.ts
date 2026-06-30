import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { WebhooksRepository } from './webhooks.repository';
import type { WebhookInsert } from '../db/schema';

let repo: WebhooksRepository;

beforeEach(() => {
  repo = new WebhooksRepository(createTestDb().db);
});

function row(id: string, overrides: Partial<WebhookInsert> = {}): WebhookInsert {
  return {
    id,
    teamId: 'team-1',
    createdBy: 'u1',
    url: 'https://hooks.example.com/' + id,
    provider: 'generic',
    eventFilter: JSON.stringify({ events: ['task.updated'] }),
    secret: 'enc',
    enabled: true,
    createdAt: `2026-06-30T00:00:0${id.slice(-1)}.000Z`,
    updatedAt: '2026-06-30T00:00:00.000Z',
    ...overrides,
  };
}

describe('WebhooksRepository', () => {
  it('insert + findById round-trips', () => {
    repo.insert(row('w1'));
    expect(repo.findById('w1')?.url).toBe('https://hooks.example.com/w1');
  });

  it('list is scoped by team and newest-first', () => {
    repo.insert(row('w1', { teamId: 'team-1' }));
    repo.insert(row('w2', { teamId: 'team-2' }));
    repo.insert(row('w3', { teamId: 'team-1' }));
    const t1 = repo.list('team-1');
    expect(t1.map((r) => r.id)).toEqual(['w3', 'w1']);
    expect(repo.list('team-2').map((r) => r.id)).toEqual(['w2']);
  });

  it('lists null-team (single-user) rows separately', () => {
    repo.insert(row('w1', { teamId: null }));
    repo.insert(row('w2', { teamId: 'team-1' }));
    expect(repo.list(null).map((r) => r.id)).toEqual(['w1']);
  });

  it('update mutates fields; remove deletes', () => {
    repo.insert(row('w1'));
    const updated = repo.update('w1', { enabled: false, url: 'https://new.example.com' });
    expect(updated?.enabled).toBe(false);
    expect(updated?.url).toBe('https://new.example.com');
    repo.remove('w1');
    expect(repo.findById('w1')).toBeUndefined();
  });
});
