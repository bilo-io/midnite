import { describe, expect, it } from 'vitest';
import type { Task } from '@midnite/shared';

import {
  bulkOpExitCode,
  bulkOpResultRows,
  bulkOpSummaryLine,
  filterTasks,
  hasFilter,
  type BulkOpResult,
} from './bulk-ops';

const task = (over: Partial<Task>): Task =>
  ({ id: 't', title: 'T', status: 'todo', priority: 1, tags: [], createdAt: '', updatedAt: '', ...over }) as Task;

describe('hasFilter', () => {
  it('is false for an empty filter and true when any field is set', () => {
    expect(hasFilter({})).toBe(false);
    expect(hasFilter({ status: 'wip' })).toBe(true);
    expect(hasFilter({ repo: 'web' })).toBe(true);
    expect(hasFilter({ project: 'p1' })).toBe(true);
  });
});

describe('filterTasks', () => {
  const tasks = [
    task({ id: 'a', status: 'todo', repo: 'web', projectId: 'p1' }),
    task({ id: 'b', status: 'wip', repo: 'web', projectId: 'p2' }),
    task({ id: 'c', status: 'todo', repo: 'api', projectId: 'p1' }),
  ];

  it('ANDs the set fields', () => {
    expect(filterTasks(tasks, { status: 'todo' }).map((t) => t.id)).toEqual(['a', 'c']);
    expect(filterTasks(tasks, { status: 'todo', repo: 'web' }).map((t) => t.id)).toEqual(['a']);
    expect(filterTasks(tasks, { project: 'p1', repo: 'api' }).map((t) => t.id)).toEqual(['c']);
  });

  it('returns everything for an empty filter', () => {
    expect(filterTasks(tasks, {})).toHaveLength(3);
  });
});

describe('summary + exit code', () => {
  const results: BulkOpResult[] = [
    { id: 'a', title: 'A', ok: true },
    { id: 'b', title: 'B', ok: false, error: 'boom' },
  ];

  it('rows carry id/title/mark/error', () => {
    expect(bulkOpResultRows(results)).toEqual([
      ['a', 'A', '✓', ''],
      ['b', 'B', '✗', 'boom'],
    ]);
  });

  it('summary counts ok/failed', () => {
    expect(bulkOpSummaryLine(results)).toBe('1 ok · 1 failed');
  });

  it('exits non-zero only when every item failed', () => {
    expect(bulkOpExitCode(results)).toBe(0); // partial success
    expect(bulkOpExitCode([{ id: 'x', title: 'X', ok: false }])).toBe(1);
    expect(bulkOpExitCode([])).toBe(0);
  });
});
