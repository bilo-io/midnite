import { describe, expect, it } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  isTerminal,
  STATUSES,
  AddTaskDependencyRequestSchema,
  ANSWER_EVENT_KIND,
  CreateTaskRequestSchema,
  MAX_TASK_DEPENDENCIES,
  MAX_TASK_TAG_LENGTH,
  SetTaskTagsRequestSchema,
  StatusSchema,
  TaskDependencyError,
  TaskKindSchema,
  TaskListQuerySchema,
  TaskSchema,
  TaskSummarySchema,
  TasksPageSchema,
  UpdateTaskProjectRequestSchema,
  isAnsweredQuestion,
} from './task.js';

const baseTask = {
  id: 't1',
  title: 'Fix the thing',
  status: 'todo' as const,
  events: [],
};

describe('StatusSchema / TaskKindSchema', () => {
  it('accepts every declared status', () => {
    for (const s of ['backlog', 'todo', 'wip', 'waiting', 'done', 'abandoned']) {
      expect(StatusSchema.parse(s)).toBe(s);
    }
  });

  it('rejects an unknown status and kind', () => {
    expect(StatusSchema.safeParse('archived').success).toBe(false);
    expect(TaskKindSchema.safeParse('epic').success).toBe(false);
  });
});

describe('TaskSchema', () => {
  it('applies defaults for priority/retryCount/tags', () => {
    const parsed = TaskSchema.parse(baseTask);
    expect(parsed.priority).toBe(1);
    expect(parsed.retryCount).toBe(0);
    expect(parsed.tags).toEqual([]);
  });

  it('rejects a priority out of the 0–3 range', () => {
    expect(TaskSchema.safeParse({ ...baseTask, priority: 4 }).success).toBe(false);
  });

  it('carries an optional dependsOn list (absent = no blockers)', () => {
    expect(TaskSchema.parse(baseTask).dependsOn).toBeUndefined();
    expect(TaskSchema.parse({ ...baseTask, dependsOn: ['a', 'b'] }).dependsOn).toEqual(['a', 'b']);
  });

  it('rejects a non-url task link', () => {
    expect(
      TaskSchema.safeParse({
        ...baseTask,
        links: [{ id: 'l1', taskId: 't1', url: 'nope', kind: 'link', createdAt: '' }],
      }).success,
    ).toBe(false);
  });
});

describe('CreateTaskRequestSchema', () => {
  it('rejects an empty prompt', () => {
    expect(CreateTaskRequestSchema.safeParse({ prompt: '' }).success).toBe(false);
  });

  it('rejects a prompt over 8000 chars', () => {
    expect(CreateTaskRequestSchema.safeParse({ prompt: 'a'.repeat(8001) }).success).toBe(false);
  });

  it('accepts an optional dependsOn list and caps it', () => {
    expect(CreateTaskRequestSchema.parse({ prompt: 'x', dependsOn: ['a', 'b'] }).dependsOn).toEqual([
      'a',
      'b',
    ]);
    const tooMany = Array.from({ length: MAX_TASK_DEPENDENCIES + 1 }, (_, i) => `t${i}`);
    expect(CreateTaskRequestSchema.safeParse({ prompt: 'x', dependsOn: tooMany }).success).toBe(false);
  });
});

describe('AddTaskDependencyRequestSchema', () => {
  it('requires a non-empty dependsOnId', () => {
    expect(AddTaskDependencyRequestSchema.parse({ dependsOnId: 't2' }).dependsOnId).toBe('t2');
    expect(AddTaskDependencyRequestSchema.safeParse({ dependsOnId: '' }).success).toBe(false);
    expect(AddTaskDependencyRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe('TaskDependencyError', () => {
  it('carries a typed reason and is an Error', () => {
    const err = new TaskDependencyError('cycle', 'would cycle');
    expect(err).toBeInstanceOf(Error);
    expect(err.reason).toBe('cycle');
    expect(err.name).toBe('TaskDependencyError');
  });
});

describe('UpdateTaskProjectRequestSchema', () => {
  it('allows null to clear the project', () => {
    expect(UpdateTaskProjectRequestSchema.parse({ projectId: null }).projectId).toBeNull();
  });
});

describe('SetTaskTagsRequestSchema', () => {
  it('round-trips an array of tags (clamping is enforced in the service)', () => {
    const tags = ['a', 'b'.repeat(MAX_TASK_TAG_LENGTH)];
    expect(SetTaskTagsRequestSchema.parse({ tags }).tags).toEqual(tags);
  });
});

describe('TaskSummary + Paged (Phase 57 C)', () => {
  it('parses a lean summary and a full Task is assignable to it', () => {
    const summary = TaskSummarySchema.parse({
      id: 't1',
      title: 'lean',
      status: 'todo',
      priority: 2,
      retryCount: 0,
      tags: ['a'],
      dependsOn: ['blk'],
      answered: true,
    });
    expect(summary.priority).toBe(2);
    expect(summary.answered).toBe(true);
    // A full Task (with events etc.) is a structural supertype — assignable to a summary.
    const full = TaskSchema.parse({ id: 't2', title: 'full', status: 'todo', events: [] });
    const asSummary = TaskSummarySchema.parse(full); // no throw — extra keys stripped
    expect(asSummary.id).toBe('t2');
  });

  it('TasksPage wraps items + total; TaskListQuery coerces page/limit', () => {
    const page = TasksPageSchema.parse({ items: [], total: 7 });
    expect(page.total).toBe(7);
    const q = TaskListQuerySchema.parse({ status: 'todo', page: '2', limit: '50' });
    expect(q).toMatchObject({ status: 'todo', page: 2, limit: 50 });
    expect(() => TaskListQuerySchema.parse({ limit: '999' })).toThrow(); // max 200
  });
});

describe('isAnsweredQuestion', () => {
  const answerEvent = { at: '2026-06-22T00:00:00Z', kind: ANSWER_EVENT_KIND };

  it('is true for a question with an answer event', () => {
    expect(isAnsweredQuestion({ kind: 'question', events: [answerEvent] })).toBe(true);
  });

  it('is false for a question with no answer event', () => {
    expect(
      isAnsweredQuestion({ kind: 'question', events: [{ at: '', kind: 'task.created' }] }),
    ).toBe(false);
  });

  it('is false for a non-question even if it somehow carries an answer event', () => {
    expect(isAnsweredQuestion({ kind: 'bug', events: [answerEvent] })).toBe(false);
    expect(isAnsweredQuestion({ kind: undefined, events: [answerEvent] })).toBe(false);
  });
});

describe('task state machine (Phase 60 E)', () => {
  it('marks done and abandoned as the only terminal states', () => {
    expect(isTerminal('done')).toBe(true);
    expect(isTerminal('abandoned')).toBe(true);
    for (const s of ['backlog', 'todo', 'wip', 'waiting'] as const) {
      expect(isTerminal(s)).toBe(false);
    }
  });

  it('terminal states have no outgoing transitions except the same-status no-op', () => {
    for (const to of STATUSES) {
      expect(canTransition('done', to)).toBe(to === 'done');
      expect(canTransition('abandoned', to)).toBe(to === 'abandoned');
    }
    expect(ALLOWED_TRANSITIONS.done).toEqual([]);
    expect(ALLOWED_TRANSITIONS.abandoned).toEqual([]);
  });

  it('rejects the audited revival edges (done→wip, done→todo, abandoned→todo)', () => {
    expect(canTransition('done', 'wip')).toBe(false);
    expect(canTransition('done', 'todo')).toBe(false);
    expect(canTransition('abandoned', 'todo')).toBe(false);
    expect(canTransition('abandoned', 'wip')).toBe(false);
  });

  it('allows the normal lifecycle edges + every same-status no-op', () => {
    expect(canTransition('todo', 'wip')).toBe(true);
    expect(canTransition('wip', 'waiting')).toBe(true);
    expect(canTransition('wip', 'done')).toBe(true);
    expect(canTransition('waiting', 'todo')).toBe(true);
    expect(canTransition('waiting', 'abandoned')).toBe(true);
    expect(canTransition('backlog', 'todo')).toBe(true);
    for (const s of STATUSES) expect(canTransition(s, s)).toBe(true);
  });
});
