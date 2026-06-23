import { describe, expect, it } from 'vitest';
import {
  AgentActivityEventSchema,
  AgentAttentionEventSchema,
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

  it('round-trips a tasks.bulkCreated event carrying the new ids', () => {
    const event = {
      type: 'tasks.bulkCreated' as const,
      at: '2026-06-21T00:00:00.000Z',
      taskIds: ['t1', 't2', 't3'],
    };
    expect(TaskBoardEventSchema.parse(event)).toEqual(event);
  });

  it('rejects a tasks.bulkCreated event without taskIds', () => {
    expect(TaskBoardEventSchema.safeParse({ type: 'tasks.bulkCreated', at: 'now' }).success).toBe(
      false,
    );
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

  it('round-trips an agent.activity running event (with tool + label)', () => {
    const event = {
      type: 'agent.activity' as const,
      at: '2026-06-23T00:00:00.000Z',
      sessionId: 'sess-1',
      phase: 'running' as const,
      tool: 'Bash',
      label: 'Run: npm test',
    };
    expect(TaskBoardEventSchema.parse(event)).toEqual(event);
    expect(AgentActivityEventSchema.parse(event)).toEqual(event);
  });

  it('round-trips an agent.activity idle event (no tool or label)', () => {
    const event = {
      type: 'agent.activity' as const,
      at: '2026-06-23T00:00:00.000Z',
      sessionId: 'sess-1',
      phase: 'idle' as const,
    };
    expect(TaskBoardEventSchema.parse(event)).toEqual(event);
  });

  it('rejects an agent.activity event with an invalid phase', () => {
    expect(
      AgentActivityEventSchema.safeParse({
        type: 'agent.activity',
        at: 'now',
        sessionId: 's',
        phase: 'exploding',
      }).success,
    ).toBe(false);
  });

  it('round-trips an agent.attention approval event', () => {
    const event = {
      type: 'agent.attention' as const,
      at: '2026-06-23T00:00:00.000Z',
      sessionId: 'sess-1',
      reason: 'approval' as const,
      summary: 'Bash: rm -rf /tmp/foo',
    };
    expect(TaskBoardEventSchema.parse(event)).toEqual(event);
    expect(AgentAttentionEventSchema.parse(event)).toEqual(event);
  });

  it('round-trips an agent.attention waiting event with no summary', () => {
    const event = {
      type: 'agent.attention' as const,
      at: 'now',
      sessionId: 's',
      reason: 'waiting' as const,
    };
    expect(TaskBoardEventSchema.parse(event)).toEqual(event);
  });
});
