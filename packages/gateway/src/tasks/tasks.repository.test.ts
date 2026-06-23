import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../test';
import { TasksRepository } from './tasks.repository';
import type { TaskInsert } from '../db/schema';

function makeRepo() {
  return new TasksRepository(createTestDb().db);
}

let repo: TasksRepository;

beforeEach(() => {
  repo = makeRepo();
});

// createdAt drives the tie-break, so vary it per insert.
function insert(id: string, partial: Partial<TaskInsert>): void {
  const at = partial.createdAt ?? `2026-06-0${id.slice(-1)}T00:00:00.000Z`;
  repo.insertTask({
    id,
    title: id,
    kind: 'unknown',
    status: 'todo',
    createdAt: at,
    updatedAt: at,
    ...partial,
  });
}

describe('TasksRepository', () => {
  it('defaults priority to 1 (Normal) and retryCount to 0', () => {
    insert('t1', {});
    const row = repo.getTask('t1')!;
    expect(row.priority).toBe(1);
    expect(row.retryCount).toBe(0);
  });

  it('lists todo tasks highest-priority first, then oldest within a priority', () => {
    // Insert deliberately out of priority order.
    insert('low', { priority: 0, createdAt: '2026-06-01T00:00:00.000Z' });
    insert('urgent', { priority: 3, createdAt: '2026-06-02T00:00:00.000Z' });
    insert('normal-old', { priority: 1, createdAt: '2026-06-03T00:00:00.000Z' });
    insert('high', { priority: 2, createdAt: '2026-06-04T00:00:00.000Z' });
    insert('normal-new', { priority: 1, createdAt: '2026-06-05T00:00:00.000Z' });

    const order = repo.listTasks('todo').map((t) => t.id);
    expect(order).toEqual(['urgent', 'high', 'normal-old', 'normal-new', 'low']);
  });

  it('incrementRetry bumps the counter by one', () => {
    insert('t1', {});
    repo.incrementRetry('t1', '2026-06-02T00:00:00.000Z');
    expect(repo.getTask('t1')!.retryCount).toBe(1);
    repo.incrementRetry('t1', '2026-06-03T00:00:00.000Z');
    expect(repo.getTask('t1')!.retryCount).toBe(2);
  });

  it('hydrates tags as [] by default and round-trips a set via setTags', () => {
    insert('t1', {});
    expect(repo.hydrate(repo.getTask('t1')!).tags).toEqual([]);

    repo.setTags('t1', ['bug', 'frontend'], '2026-06-02T00:00:00.000Z');
    expect(repo.hydrate(repo.getTask('t1')!).tags).toEqual(['bug', 'frontend']);

    // Clearing persists an empty set, not null garbage.
    repo.setTags('t1', [], '2026-06-03T00:00:00.000Z');
    expect(repo.hydrate(repo.getTask('t1')!).tags).toEqual([]);
  });
});

describe('TasksRepository — PR status (Phase 22 Theme C)', () => {
  const url1 = 'https://github.com/bilo-io/midnite/pull/1';
  const url2 = 'https://github.com/bilo-io/midnite/pull/2';

  it('upserts, hydrates, and excludes terminal PRs from the poll set', () => {
    insert('t1', { prUrl: url1 });
    insert('t2', { prUrl: url2 });
    insert('t3', {}); // no PR — never in the poll set

    // Before any status row, both PR tasks are due for a refresh.
    expect(repo.listTasksWithUnmergedPr().map((r) => r.id).sort()).toEqual(['t1', 't2']);
    expect(repo.hydrate(repo.getTask('t1')!).prStatus).toBeUndefined();

    repo.upsertPrStatus({
      taskId: 't1',
      url: url1,
      number: 1,
      state: 'open',
      checks: 'passing',
      fetchedAt: 'z',
    });
    expect(repo.hydrate(repo.getTask('t1')!).prStatus).toMatchObject({
      state: 'open',
      checks: 'passing',
      number: 1,
      url: url1,
    });

    // Upsert replaces the row in place (keyed by task id) and persists a review decision.
    repo.upsertPrStatus({
      taskId: 't1',
      url: url1,
      number: 1,
      state: 'merged',
      checks: 'passing',
      reviewDecision: 'approved',
      fetchedAt: 'z2',
    });
    expect(repo.getPrStatusRow('t1')).toMatchObject({ state: 'merged', reviewDecision: 'approved' });

    // A merged PR drops out of the poll set; t2 (no status yet) stays.
    expect(repo.listTasksWithUnmergedPr().map((r) => r.id)).toEqual(['t2']);
  });

  it('clears the pr_status row when the task is deleted', () => {
    insert('t1', { prUrl: url1, archivedAt: '2026-01-01T00:00:00.000Z' });
    repo.upsertPrStatus({ taskId: 't1', url: url1, number: 1, state: 'open', checks: 'none', fetchedAt: 'z' });
    repo.deleteTask('t1');
    expect(repo.getPrStatusRow('t1')).toBeUndefined();
  });
});
