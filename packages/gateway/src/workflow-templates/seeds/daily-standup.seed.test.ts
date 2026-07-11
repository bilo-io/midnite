import { describe, expect, it } from 'vitest';

import seed from './daily-standup.seed';

describe('daily-standup seed', () => {
  it('is a task-creating starter', () => {
    expect(seed.slug).toBe('daily-standup');
    expect(seed.category).toBe('notifications');
    expect(seed.tags).toContain('standup');
  });

  it('defines a [manual] → [task.create] graph', () => {
    const def = seed.definition as {
      trigger: { type: string };
      nodes: { type: string }[];
      edges: unknown[];
    };
    expect(def.trigger.type).toBe('manual');
    expect(def.nodes.map((n) => n.type)).toEqual(['trigger.manual', 'task.create']);
    expect(def.edges).toHaveLength(1);
  });
});
