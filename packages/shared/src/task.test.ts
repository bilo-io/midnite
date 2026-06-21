import { describe, expect, it } from 'vitest';
import {
  ANSWER_EVENT_KIND,
  CreateTaskRequestSchema,
  MAX_TASK_TAG_LENGTH,
  SetTaskTagsRequestSchema,
  StatusSchema,
  TaskKindSchema,
  TaskSchema,
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
