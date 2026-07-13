import { describe, expect, it } from 'vitest';
import {
  DigestListItemSchema,
  DigestListResponseSchema,
  DigestResponseSchema,
  DigestSchema,
  RetroResponseSchema,
  TaskRetroSchema,
  isRetroNotable,
} from './retro.js';
import type { TaskRetro } from './retro.js';

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

describe('isRetroNotable', () => {
  const base = { outcome: 'done' as const, failures: [], checks: undefined } as Pick<
    TaskRetro,
    'outcome' | 'failures' | 'checks'
  >;
  const failure = (cls: string) =>
    ({ id: 'f', taskId: 't1', class: cls, detail: '', retryIndex: 0, at: 'now' }) as TaskRetro['failures'][number];

  it('is false for a clean done task', () => {
    expect(isRetroNotable(base)).toBe(false);
  });

  it('is true when abandoned', () => {
    expect(isRetroNotable({ ...base, outcome: 'abandoned' })).toBe(true);
  });

  it('is true when escalated to needs-attention', () => {
    expect(isRetroNotable({ ...base, outcome: 'needs-attention' })).toBe(true);
  });

  it('is true on a retries-exhausted or gate-failed failure', () => {
    expect(isRetroNotable({ ...base, failures: [failure('retries-exhausted')] })).toBe(true);
    expect(isRetroNotable({ ...base, failures: [failure('gate-failed')] })).toBe(true);
  });

  it('is false for a transient failure that recovered (e.g. a retried crash)', () => {
    expect(isRetroNotable({ ...base, failures: [failure('crash')] })).toBe(false);
  });

  it('is true when a check run failed', () => {
    expect(isRetroNotable({ ...base, checks: { status: 'failing', passed: 1, failed: 2 } })).toBe(true);
    expect(isRetroNotable({ ...base, checks: { status: 'passed', passed: 3, failed: 0 } })).toBe(false);
  });
});

const digest = {
  id: 'd1',
  createdAt: '2026-07-08T00:00:00.000Z',
  from: '2026-07-07T00:00:00.000Z',
  to: '2026-07-08T00:00:00.000Z',
  counts: { shipped: 3, failed: 1, needsAttention: 1 },
  sections: [{ name: 'midnite', shipped: 3, failed: 1 }],
  highlights: [{ taskId: 't9', title: 'Fix flake', outcome: 'abandoned' as const, note: 'still flaky' }],
  spend: { totalUsd: 4.2, measuredUsd: 4.2, sessions: 5 },
  cycle: { tasks: 4, p50Ms: 120000, p90Ms: 480000 },
  headline: '3 shipped, 1 failed.',
  markdown: '# Fleet digest',
};

describe('DigestSchema', () => {
  it('round-trips a full digest', () => {
    expect(DigestSchema.parse(digest)).toEqual(digest);
  });

  it('accepts null spend + cycle (best-effort degraded)', () => {
    const parsed = DigestSchema.parse({ ...digest, spend: null, cycle: null });
    expect(parsed.spend).toBeNull();
    expect(parsed.cycle).toBeNull();
  });

  it('allows omitting spend + cycle entirely', () => {
    const { spend, cycle, ...rest } = digest;
    void spend;
    void cycle;
    expect(DigestSchema.safeParse(rest).success).toBe(true);
  });

  it('rejects a bad highlight outcome', () => {
    const bad = { ...digest, highlights: [{ ...digest.highlights[0], outcome: 'wip' }] };
    expect(DigestSchema.safeParse(bad).success).toBe(false);
  });
});

describe('Digest read contracts (Phase 62 G)', () => {
  const item = {
    id: 'd1',
    createdAt: digest.createdAt,
    from: digest.from,
    to: digest.to,
    headline: digest.headline,
    counts: digest.counts,
  };

  it('round-trips a lightweight list item', () => {
    expect(DigestListItemSchema.parse(item)).toEqual(item);
  });

  it('a list item omits the heavy fields', () => {
    // The feed row must not require sections/highlights/markdown.
    expect(DigestListItemSchema.safeParse(item).success).toBe(true);
    expect(item).not.toHaveProperty('markdown');
  });

  it('wraps items in a list response', () => {
    expect(DigestListResponseSchema.parse({ digests: [item] }).digests).toHaveLength(1);
  });

  it('wraps a full digest in a single response', () => {
    expect(DigestResponseSchema.parse({ digest }).digest.id).toBe('d1');
  });
});
