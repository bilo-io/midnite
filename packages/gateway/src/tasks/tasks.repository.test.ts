import { beforeEach, describe, expect, it } from 'vitest';
import type { CheckResult } from '@midnite/shared';
import { createTestDb } from '../test';
import { TasksRepository } from './tasks.repository';
import type { TaskCheckRunInsert, TaskInsert } from '../db/schema';

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

const passingResult: CheckResult = {
  name: 'unit',
  command: 'pnpm test',
  exitCode: 0,
  passed: true,
  durationMs: 120,
  output: '',
};

const failingResult: CheckResult = {
  name: 'lint',
  command: 'pnpm lint',
  exitCode: 1,
  passed: false,
  durationMs: 50,
  output: 'error: unused variable',
};

function makeRun(id: string, overrides: Partial<TaskCheckRunInsert> = {}): TaskCheckRunInsert {
  return {
    id,
    taskId: 't1',
    trigger: 'gate',
    passed: 1,
    startedAt: `2026-06-01T00:0${id.slice(-1)}:00.000Z`,
    finishedAt: `2026-06-01T00:0${id.slice(-1)}:01.000Z`,
    results: JSON.stringify([passingResult]),
    ...overrides,
  };
}

describe('TasksRepository — check runs', () => {
  beforeEach(() => {
    repo = makeRepo();
    insert('t1', {});
  });

  it('insertCheckRun + checkRunsForTask round-trips a run with parsed results', () => {
    repo.insertCheckRun(makeRun('r1'));
    const runs = repo.checkRunsForTask('t1');
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      id: 'r1',
      taskId: 't1',
      trigger: 'gate',
      passed: true,
      results: [passingResult],
    });
  });

  it('checkRunsForTask returns runs ordered oldest-first', () => {
    repo.insertCheckRun(makeRun('r2', { startedAt: '2026-06-01T00:02:00.000Z' }));
    repo.insertCheckRun(makeRun('r1', { startedAt: '2026-06-01T00:01:00.000Z' }));
    const ids = repo.checkRunsForTask('t1').map((r) => r.id);
    expect(ids).toEqual(['r1', 'r2']);
  });

  it('latestCheckRunForTask returns the most recent run', () => {
    repo.insertCheckRun(makeRun('r1', { startedAt: '2026-06-01T00:01:00.000Z' }));
    repo.insertCheckRun(makeRun('r2', { startedAt: '2026-06-01T00:02:00.000Z' }));
    expect(repo.latestCheckRunForTask('t1')!.id).toBe('r2');
  });

  it('latestCheckRunForTask returns null when no runs exist', () => {
    expect(repo.latestCheckRunForTask('t1')).toBeNull();
  });

  it('stores passed=false correctly and parses multi-result JSON', () => {
    repo.insertCheckRun(makeRun('r1', {
      passed: 0,
      results: JSON.stringify([passingResult, failingResult]),
    }));
    const run = repo.latestCheckRunForTask('t1')!;
    expect(run.passed).toBe(false);
    expect(run.results).toHaveLength(2);
    expect(run.results[1]).toMatchObject({ name: 'lint', passed: false });
  });

  it('trigger field round-trips all valid values', () => {
    for (const trigger of ['gate', 'manual', 'auto-fix'] as const) {
      repo.insertCheckRun({ ...makeRun(`r-${trigger}`), trigger });
      const run = repo.latestCheckRunForTask('t1')!;
      expect(run.trigger).toBe(trigger);
    }
  });

  it('checkRunsForTask returns [] for a task with no runs', () => {
    expect(repo.checkRunsForTask('t1')).toEqual([]);
  });

  it('checkRunsForTask scopes to the given taskId', () => {
    insert('t2', {});
    repo.insertCheckRun(makeRun('r1', { taskId: 't1' }));
    repo.insertCheckRun(makeRun('r2', { taskId: 't2' }));
    expect(repo.checkRunsForTask('t1').map((r) => r.id)).toEqual(['r1']);
    expect(repo.checkRunsForTask('t2').map((r) => r.id)).toEqual(['r2']);
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
