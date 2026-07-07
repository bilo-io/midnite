import { describe, expect, it } from 'vitest';
import { RetroResponseSchema, TaskRetroSchema } from './retro.js';

const skeleton = {
  taskId: 't1',
  outcome: 'done' as const,
  timeline: [{ at: '2026-07-07T09:00:00.000Z', kind: 'task.created' }],
  attempts: [{ startedAt: '2026-07-07T09:10:00.000Z', endedAt: null, durationMs: null, outcome: null, retryIndex: 0 }],
  failures: [],
  durations: { waitMs: 600000, workMs: null, totalMs: null },
  narrative: null,
  createdAt: '2026-07-07T10:00:00.000Z',
};

describe('TaskRetroSchema', () => {
  it('round-trips a deterministic skeleton (null narrative)', () => {
    expect(TaskRetroSchema.parse(skeleton)).toEqual(skeleton);
  });

  it('accepts optional checks/review/prUrl + an LLM narrative', () => {
    const full = {
      ...skeleton,
      checks: { status: 'passed' as const, passed: 2, failed: 0 },
      review: { verdict: 'approved' as const, summary: 'LGTM' },
      prUrl: 'https://gh/pr/1',
      narrative: { whatHappened: 'shipped', whatTrippedIt: null, notable: ['fast'], generatedBy: 'llm' as const },
    };
    expect(TaskRetroSchema.parse(full)).toEqual(full);
  });

  it('rejects a bad outcome', () => {
    expect(TaskRetroSchema.safeParse({ ...skeleton, outcome: 'wip' }).success).toBe(false);
  });

  it('requires the narrative field to be present (nullable, not optional)', () => {
    const { narrative, ...withoutNarrative } = skeleton;
    void narrative;
    expect(TaskRetroSchema.safeParse(withoutNarrative).success).toBe(false);
  });

  it('RetroResponse wraps a retro', () => {
    expect(RetroResponseSchema.parse({ retro: skeleton }).retro.taskId).toBe('t1');
  });
});
