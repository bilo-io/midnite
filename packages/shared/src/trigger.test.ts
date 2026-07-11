import { describe, expect, it } from 'vitest';
import { TriggerSchema } from './trigger.js';

describe('TriggerSchema (discriminated union)', () => {
  it('narrows a manual trigger on its type', () => {
    const t = TriggerSchema.parse({ type: 'manual' });
    expect(t.type).toBe('manual');
  });

  it('rejects a removed schedule trigger', () => {
    expect(TriggerSchema.safeParse({ type: 'schedule', cron: '0 * * * *' }).success).toBe(false);
  });

  it('defaults a webhook trigger method to POST and hasSecret to false', () => {
    const t = TriggerSchema.parse({ type: 'webhook' });
    if (t.type !== 'webhook') throw new Error('expected webhook');
    expect(t.method).toBe('POST');
    expect(t.hasSecret).toBe(false);
  });

  it('rejects an unknown discriminant', () => {
    expect(TriggerSchema.safeParse({ type: 'cron' }).success).toBe(false);
  });

  it('rejects a webhook trigger with an invalid method', () => {
    expect(TriggerSchema.safeParse({ type: 'webhook', method: 'TRACE' }).success).toBe(false);
  });

  it('narrows a task-event trigger and keeps its events', () => {
    const t = TriggerSchema.parse({ type: 'task-event', events: ['task.done', 'task.abandoned'] });
    if (t.type !== 'task-event') throw new Error('expected task-event');
    expect(t.events).toEqual(['task.done', 'task.abandoned']);
    expect(t.filter).toBeUndefined();
  });

  it('accepts a task-event trigger with a filter', () => {
    const t = TriggerSchema.parse({
      type: 'task-event',
      events: ['task.needs-attention'],
      filter: { repo: 'acme/api', projectId: 'p1', priority: 3 },
    });
    if (t.type !== 'task-event') throw new Error('expected task-event');
    expect(t.filter).toEqual({ repo: 'acme/api', projectId: 'p1', priority: 3 });
  });

  it('rejects a task-event trigger with no events', () => {
    expect(TriggerSchema.safeParse({ type: 'task-event', events: [] }).success).toBe(false);
  });

  it('rejects a task-event trigger with an unknown event', () => {
    expect(
      TriggerSchema.safeParse({ type: 'task-event', events: ['task.started'] }).success,
    ).toBe(false);
  });

  it('rejects a task-event filter priority out of range', () => {
    expect(
      TriggerSchema.safeParse({ type: 'task-event', events: ['task.done'], filter: { priority: 5 } })
        .success,
    ).toBe(false);
  });
});
