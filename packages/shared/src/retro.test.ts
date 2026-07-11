import { describe, expect, it } from 'vitest';
import { DigestSchema, RetroResponseSchema, TaskRetroSchema } from './retro.js';

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

const digest = {
  id: 'd1',
  createdAt: '2026-07-11T08:00:00.000Z',
  window: { from: '2026-07-10T08:00:00.000Z', to: '2026-07-11T08:00:00.000Z' },
  groupBy: 'repo' as const,
  counts: { shipped: 3, failed: 1, needsAttention: 0, total: 4 },
  sections: [
    { key: 'midnite', label: 'midnite', grouping: 'repo' as const, counts: { shipped: 3, failed: 1, needsAttention: 0, total: 4 }, taskIds: ['t1', 't2'] },
  ],
  highlights: [{ taskId: 't2', title: 'flaky spec', outcome: 'abandoned' as const, note: 'retries exhausted' }],
  spend: null,
  cycle: null,
  headline: null,
  markdown: '# Digest\n\n3 shipped, 1 failed.',
};

describe('DigestSchema', () => {
  it('round-trips a deterministic digest (null headline/spend/cycle)', () => {
    expect(DigestSchema.parse(digest)).toEqual(digest);
  });

  it('accepts an LLM headline + best-effort spend/cycle', () => {
    const full = {
      ...digest,
      headline: { headline: 'A quiet day: 3 shipped.', generatedBy: 'llm' as const },
      spend: { totalUsd: 1.23, measuredUsd: 1.0, estimatedUsd: 0.23, unpricedSessions: 1 },
      cycle: { p50WorkMs: 60000, p90WorkMs: 120000 },
    };
    expect(DigestSchema.parse(full)).toEqual(full);
  });

  it('rejects a bad groupBy', () => {
    expect(DigestSchema.safeParse({ ...digest, groupBy: 'team' }).success).toBe(false);
  });
});
