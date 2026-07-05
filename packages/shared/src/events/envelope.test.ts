import { describe, expect, it } from 'vitest';
import { SequencedTaskBoardEventSchema } from './task.js';
import { sequencedEnvelope } from './envelope.js';
import { z } from 'zod';

describe('sequencedEnvelope', () => {
  it('round-trips a wrapped task event, carrying the union untouched', () => {
    const wire = {
      seq: 7,
      ts: 1_720_000_000_000,
      event: { type: 'task.deleted', at: '2026-07-05T00:00:00Z', id: 't1' },
    };
    const parsed = SequencedTaskBoardEventSchema.parse(wire);
    expect(parsed.seq).toBe(7);
    expect(parsed.event.type).toBe('task.deleted');
    if (parsed.event.type === 'task.deleted') expect(parsed.event.id).toBe('t1');
  });

  it('rejects a frame missing seq', () => {
    const bad = { ts: 1, event: { type: 'task.deleted', at: 'x', id: 't1' } };
    expect(SequencedTaskBoardEventSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown event type inside the envelope', () => {
    const bad = { seq: 1, ts: 1, event: { type: 'nope' } };
    expect(SequencedTaskBoardEventSchema.safeParse(bad).success).toBe(false);
  });

  it('is generic over the carried schema', () => {
    const schema = sequencedEnvelope(z.object({ type: z.literal('ping') }));
    expect(schema.parse({ seq: 0, ts: 0, event: { type: 'ping' } }).event.type).toBe('ping');
  });
});
