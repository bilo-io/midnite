import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { ChatCommandsRepository } from './chat-commands.repository';
import type { ChatCommandInsert } from '../db/schema';

let repo: ChatCommandsRepository;

beforeEach(() => {
  repo = new ChatCommandsRepository(createTestDb().db);
});

function row(id: string, overrides: Partial<ChatCommandInsert> = {}): ChatCommandInsert {
  return {
    id,
    userId: 'u1',
    teamId: 'team-1',
    text: 'add "x"',
    intentType: 'createTask',
    inferencePath: 'deterministic',
    affectedIds: JSON.stringify(['new1']),
    revertPlan: JSON.stringify([{ kind: 'delete', taskId: 'new1' }]),
    createdAt: '2026-07-06T00:00:00.000Z',
    undoneAt: null,
    ...overrides,
  };
}

describe('ChatCommandsRepository (migration smoke + CRUD)', () => {
  it('migration creates the table so insert + read round-trips', () => {
    const inserted = repo.insert(row('c1'));
    expect(inserted.id).toBe('c1');
    expect(repo.getById('c1')?.revertPlan).toBe(JSON.stringify([{ kind: 'delete', taskId: 'new1' }]));
  });

  it('scopes reads by team + user', () => {
    repo.insert(row('c1', { userId: 'u1', teamId: 'team-1' }));
    // Wrong team → not visible.
    expect(repo.getById('c1', { userId: 'u9', teamId: 'team-9' })).toBeUndefined();
    // Right scope → visible.
    expect(repo.getById('c1', { userId: 'u1', teamId: 'team-1' })?.id).toBe('c1');
  });

  it('markUndone stamps undoneAt', () => {
    repo.insert(row('c1'));
    repo.markUndone('c1', '2026-07-06T01:00:00.000Z');
    expect(repo.getById('c1')?.undoneAt).toBe('2026-07-06T01:00:00.000Z');
  });
});
