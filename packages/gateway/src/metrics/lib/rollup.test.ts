import { describe, expect, it } from 'vitest';

import { currentBucketStart, isoDaysBefore, rollupKey } from './rollup';

describe('rollupKey', () => {
  it('joins the dims, using empty segments for nulls', () => {
    expect(rollupKey({ period: 'daily', bucketStart: '2026-06-01T00:00:00.000Z', source: 'runs', repo: 'web', provider: null, model: null })).toBe(
      'daily|2026-06-01T00:00:00.000Z|runs|web||',
    );
    expect(rollupKey({ period: 'hourly', bucketStart: '2026-06-01T14:00:00.000Z', source: 'llm', repo: null, provider: 'anthropic', model: 'opus' })).toBe(
      'hourly|2026-06-01T14:00:00.000Z|llm||anthropic|opus',
    );
  });

  it('is stable → same dims produce the same key (idempotent upsert target)', () => {
    const r = { period: 'daily', bucketStart: 'b', source: 'gauge' as const, repo: null, provider: null, model: null };
    expect(rollupKey(r)).toBe(rollupKey({ ...r }));
  });
});

describe('currentBucketStart', () => {
  it('floors to the hour for hourly', () => {
    expect(currentBucketStart('2026-06-01T14:37:22.500Z', 'hourly')).toBe('2026-06-01T14:00:00.000Z');
  });
  it('floors to the day for daily', () => {
    expect(currentBucketStart('2026-06-01T14:37:22.500Z', 'daily')).toBe('2026-06-01T00:00:00.000Z');
  });
});

describe('isoDaysBefore', () => {
  it('subtracts whole days', () => {
    expect(isoDaysBefore('2026-06-10T00:00:00.000Z', 3)).toBe('2026-06-07T00:00:00.000Z');
  });
});
