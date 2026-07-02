import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDbHandle } from '../test/db';
import { TaskFailuresRepository } from './task-failures.repository';

describe('TaskFailuresRepository', () => {
  let handle: TestDbHandle;
  let repo: TaskFailuresRepository;

  beforeEach(() => {
    handle = createTestDb();
    repo = new TaskFailuresRepository(handle.db);
  });
  afterEach(() => handle.close());

  it('round-trips a failure row and maps it to the shared shape', () => {
    repo.insert({
      id: 'f1',
      taskId: 't1',
      class: 'crash',
      detail: 'exit 1',
      exitCode: 1,
      lastOutput: 'boom\n',
      retryIndex: 0,
      teamId: null,
      at: '2026-07-02T00:00:00Z',
    });

    const rows = repo.listByTask('t1');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'f1',
      taskId: 't1',
      class: 'crash',
      exitCode: 1,
      lastOutput: 'boom\n',
      retryIndex: 0,
    });
    // nullable columns surface as undefined (exitCode) / null (lastOutput) per schema
    expect(rows[0]!.teamId).toBeUndefined();
  });

  it('returns failures oldest-first and scoped to the task', () => {
    repo.insert({ id: 'a', taskId: 't1', class: 'crash', detail: '1', retryIndex: 0, at: '2026-07-02T00:00:01Z' });
    repo.insert({ id: 'b', taskId: 't1', class: 'timeout', detail: '2', retryIndex: 1, at: '2026-07-02T00:00:02Z' });
    repo.insert({ id: 'c', taskId: 't2', class: 'crash', detail: 'other', retryIndex: 0, at: '2026-07-02T00:00:03Z' });

    const t1 = repo.listByTask('t1');
    expect(t1.map((f) => f.id)).toEqual(['a', 'b']);
    expect(repo.listByTask('t2').map((f) => f.id)).toEqual(['c']);
  });
});
