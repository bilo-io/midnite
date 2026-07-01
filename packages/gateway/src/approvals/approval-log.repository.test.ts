import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { ApprovalLogRepository } from './approval-log.repository';
import type { ApprovalLogInsert } from '../db/schema';

let repo: ApprovalLogRepository;

beforeEach(() => {
  repo = new ApprovalLogRepository(createTestDb().db);
});

function entry(id: string, over: Partial<ApprovalLogInsert> = {}): ApprovalLogInsert {
  return {
    id,
    sessionId: 'sess-1',
    taskId: 'task-1',
    toolName: 'Bash',
    summary: null,
    resolution: 'allow',
    ruleId: null,
    decidedBy: 'user',
    createdAt: `2026-07-01T00:00:0${id.slice(-1)}.000Z`,
    ...over,
  };
}

describe('ApprovalLogRepository sessionId filter (Phase 51)', () => {
  it('filters the log to one session', () => {
    repo.insert(entry('1', { sessionId: 'sess-1' }));
    repo.insert(entry('2', { sessionId: 'sess-1' }));
    repo.insert(entry('3', { sessionId: 'sess-2' }));

    const one = repo.list({ page: 1, limit: 50, sessionId: 'sess-1' });
    expect(one.total).toBe(2);
    expect(one.entries.every((e) => e.sessionId === 'sess-1')).toBe(true);

    const all = repo.list({ page: 1, limit: 50 });
    expect(all.total).toBe(3);
  });

  it('composes sessionId with taskId', () => {
    repo.insert(entry('1', { sessionId: 'sess-1', taskId: 'task-a' }));
    repo.insert(entry('2', { sessionId: 'sess-1', taskId: 'task-b' }));
    const res = repo.list({ page: 1, limit: 50, sessionId: 'sess-1', taskId: 'task-a' });
    expect(res.total).toBe(1);
    expect(res.entries[0]!.taskId).toBe('task-a');
  });
});
