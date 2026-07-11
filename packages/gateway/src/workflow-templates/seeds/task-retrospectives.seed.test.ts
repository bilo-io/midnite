import { describe, expect, it } from 'vitest';
import { TriggerSchema } from '@midnite/shared';

import seed from './task-retrospectives.seed';

describe('task-retrospectives seed', () => {
  it('is a task-event notifications template', () => {
    expect(seed.slug).toBe('task-retrospectives');
    expect(seed.category).toBe('notifications');
    expect(seed.credentialSlots ?? []).toHaveLength(0); // in-app notify needs no credential
  });

  it('fires on task done + abandoned via a valid task-event trigger', () => {
    const def = seed.definition as { trigger: Record<string, unknown> };
    const trigger = TriggerSchema.parse(def.trigger);
    expect(trigger.type).toBe('task-event');
    if (trigger.type !== 'task-event') throw new Error('unreachable');
    expect(trigger.events).toEqual(['task.done', 'task.abandoned']);
  });

  it('wires trigger → generate-retro → branch(notable) →(true) notify', () => {
    const def = seed.definition as {
      nodes: { id: string; type: string; params?: Record<string, unknown> }[];
      edges: { source: string; target: string; sourceHandle?: string }[];
    };
    expect(def.nodes.map((n) => n.type)).toEqual([
      'trigger.task-event',
      'midnite.generate-retro',
      'logic.branch',
      'midnite.notify',
    ]);

    // The branch tests the generate-retro output's `notable` flag.
    const branch = def.nodes.find((n) => n.type === 'logic.branch')!;
    expect(branch.params).toMatchObject({ left: 'notable', operator: 'isTruthy' });

    // Notify only runs on the notable (true) path.
    const notifyEdge = def.edges.find((e) => e.target === 'n4')!;
    expect(notifyEdge.sourceHandle).toBe('true');
    expect(notifyEdge.source).toBe('n3');

    const notify = def.nodes.find((n) => n.type === 'midnite.notify')!;
    expect(notify.params).toMatchObject({ kind: 'retro.notable' });
  });
});
