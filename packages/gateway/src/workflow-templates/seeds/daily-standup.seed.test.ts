import { describe, expect, it } from 'vitest';

import seed from './daily-standup.seed';

describe('daily-standup seed', () => {
  it('is a task-creating schedule starter the facade can surface', () => {
    expect(seed.slug).toBe('daily-standup');
    expect(seed.category).toBe('scheduling');
    // The Schedules "New from preset" menu filters on this tag.
    expect(seed.tags).toContain('recurring-task');
  });

  it('defines a [schedule] → [task.create] graph', () => {
    const def = seed.definition as {
      trigger: { type: string; cron: string };
      nodes: { type: string }[];
      edges: unknown[];
    };
    expect(def.trigger.type).toBe('schedule');
    expect(def.trigger.cron).toBe('0 9 * * 1-5'); // weekdays 09:00
    expect(def.nodes.map((n) => n.type)).toEqual(['trigger.schedule', 'task.create']);
    expect(def.edges).toHaveLength(1);
  });
});
