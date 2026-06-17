import { describe, expect, it } from 'vitest';
import { AgentPoolSnapshotSchema } from './agent-pool.js';

describe('AgentPoolSnapshotSchema', () => {
  it('round-trips a populated snapshot', () => {
    const snapshot = {
      capacity: 4,
      busy: 1,
      queuedTodo: 3,
      slots: [
        { id: 'slot-0', status: 'busy' as const, taskId: 't1', pid: 1234 },
        { id: 'slot-1', status: 'idle' as const },
      ],
    };
    const parsed = AgentPoolSnapshotSchema.parse(snapshot);
    expect(parsed).toEqual(snapshot);
  });

  it('rejects an invalid slot status', () => {
    expect(() =>
      AgentPoolSnapshotSchema.parse({
        capacity: 1,
        busy: 0,
        queuedTodo: 0,
        slots: [{ id: 'slot-0', status: 'running' }],
      }),
    ).toThrow();
  });
});
