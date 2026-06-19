import { describe, expect, it } from 'vitest';
import {
  TaskBoardEventSchema,
  TaskSubscribeMessageSchema,
  TASKS_WS_PATH,
} from './task.js';

describe('task board events', () => {
  it('round-trips a task.deleted event', () => {
    const event = { type: 'task.deleted' as const, at: '2026-06-19T00:00:00.000Z', id: 't1' };
    const parsed = TaskBoardEventSchema.parse(event);
    expect(parsed).toEqual(event);
  });

  it('rejects an unknown event type', () => {
    expect(TaskBoardEventSchema.safeParse({ type: 'task.exploded', at: 'now', id: 'x' }).success).toBe(
      false,
    );
  });

  it('requires a task payload on task.updated (id alone is not enough)', () => {
    expect(TaskBoardEventSchema.safeParse({ type: 'task.updated', at: 'now', id: 't1' }).success).toBe(
      false,
    );
  });

  it('parses the subscribe message and exposes a stable path', () => {
    expect(TaskSubscribeMessageSchema.safeParse({ type: 'subscribe' }).success).toBe(true);
    expect(TaskSubscribeMessageSchema.safeParse({ type: 'nope' }).success).toBe(false);
    expect(TASKS_WS_PATH).toBe('/ws/tasks');
  });
});
