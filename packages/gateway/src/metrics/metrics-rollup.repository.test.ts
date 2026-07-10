import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { MetricsRepository } from './metrics.repository';
import { rollupKey } from './lib/rollup';
import {
  agentRunStats,
  gaugeSamples,
  llmUsage,
  sessionUsage,
  tasks,
  type MetricsRollupInsert,
} from '../db/schema';

type TestDb = ReturnType<typeof createTestDb>['db'];
let db: TestDb;
let repo: MetricsRepository;

beforeEach(() => {
  db = createTestDb().db;
  repo = new MetricsRepository(db);
});

/** Turn aggregate rows into full inserts (what the service does) for upsert tests. */
function finalize(rows: ReturnType<MetricsRepository['aggregateForRollup']>, at = '2026-06-02T00:00:00.000Z'): MetricsRollupInsert[] {
  return rows.map((r) => ({ ...r, key: rollupKey(r), createdAt: at }));
}

describe('aggregateForRollup', () => {
  beforeEach(() => {
    // Two agent runs in the 14:00 hour on repo "web", one abandoned + a retry.
    db.insert(agentRunStats).values([
      { id: 'r1', taskId: 't1', startedAt: '2026-06-01T14:05:00.000Z', endedAt: '2026-06-01T14:06:00.000Z', durationMs: 60000, outcome: 'done', retryCount: 0, repo: 'web' },
      { id: 'r2', taskId: 't2', startedAt: '2026-06-01T14:30:00.000Z', endedAt: '2026-06-01T14:31:00.000Z', durationMs: 30000, outcome: 'abandoned', retryCount: 2, repo: 'web' },
    ]).run();
    // Two LLM calls, same provider/model, in the 14:00 hour.
    db.insert(llmUsage).values([
      { id: 'l1', at: '2026-06-01T14:10:00.000Z', provider: 'anthropic', model: 'opus', feature: 'plan', inputTokens: 100, outputTokens: 20, estCostUsd: 0.5 },
      { id: 'l2', at: '2026-06-01T14:40:00.000Z', provider: 'anthropic', model: 'opus', feature: 'act', inputTokens: 200, outputTokens: 40, estCostUsd: 1.0 },
    ]).run();
    // A session harvested in the 14:00 hour, its task on repo "web".
    db.insert(tasks).values({ id: 's1', title: 's1', status: 'done', priority: 1, repo: 'web', createdAt: '2026-06-01T13:00:00.000Z', updatedAt: '2026-06-01T14:00:00.000Z' }).run();
    db.insert(sessionUsage).values({ sessionId: 's1', agentCli: 'claude', model: 'opus', inputTokens: 500, outputTokens: 100, cachedReadTokens: 0, cachedWriteTokens: 0, contextTokens: 600, estCostUsd: 2.0, updatedAt: '2026-06-01T14:20:00.000Z' }).run();
    // Two gauge samples in the 14:00 hour.
    db.insert(gaugeSamples).values([
      { id: 'g1', at: '2026-06-01T14:00:00.000Z', queueDepth: 2, slotsUsed: 1, slotsTotal: 4, tickLatencyMs: 10 },
      { id: 'g2', at: '2026-06-01T14:50:00.000Z', queueDepth: 4, slotsUsed: 3, slotsTotal: 4, tickLatencyMs: 30 },
    ]).run();
  });

  it('buckets the runs source by repo with outcome + duration + retry counts', () => {
    const rows = repo.aggregateForRollup('hourly', '2026-06-01T00:00:00.000Z', '2026-06-02T00:00:00.000Z');
    const runs = rows.find((r) => r.source === 'runs');
    expect(runs).toMatchObject({
      bucketStart: '2026-06-01T14:00:00.000Z',
      repo: 'web',
      runCount: 2,
      doneCount: 1,
      abandonedCount: 1,
      failedCount: 0,
      totalDurationMs: 90000,
      retriedRuns: 1,
    });
  });

  it('buckets llm by provider/model with summed tokens + cost', () => {
    const rows = repo.aggregateForRollup('hourly', '2026-06-01T00:00:00.000Z', '2026-06-02T00:00:00.000Z');
    const llm = rows.find((r) => r.source === 'llm');
    expect(llm).toMatchObject({ provider: 'anthropic', model: 'opus', calls: 2, inputTokens: 300, outputTokens: 60, estCostUsd: 1.5 });
  });

  it('joins session usage to its task repo', () => {
    const rows = repo.aggregateForRollup('hourly', '2026-06-01T00:00:00.000Z', '2026-06-02T00:00:00.000Z');
    const session = rows.find((r) => r.source === 'session');
    expect(session).toMatchObject({ repo: 'web', model: 'opus', calls: 1, inputTokens: 500, estCostUsd: 2.0 });
  });

  it('averages gauge samples over the bucket', () => {
    const rows = repo.aggregateForRollup('hourly', '2026-06-01T00:00:00.000Z', '2026-06-02T00:00:00.000Z');
    const gauge = rows.find((r) => r.source === 'gauge');
    expect(gauge).toMatchObject({ avgQueueDepth: 3, avgSlotsUsed: 2, avgTickLatencyMs: 20, sampleCount: 2 });
  });

  it('excludes rows at/after the `before` cutoff (open bucket)', () => {
    // `before` = 14:00 → the 14:xx rows are all in the still-open bucket, excluded.
    const rows = repo.aggregateForRollup('hourly', '2026-06-01T00:00:00.000Z', '2026-06-01T14:00:00.000Z');
    expect(rows).toHaveLength(0);
  });

  it('daily period buckets to the day start', () => {
    const rows = repo.aggregateForRollup('daily', '2026-06-01T00:00:00.000Z', '2026-06-02T00:00:00.000Z');
    expect(rows.every((r) => r.bucketStart === '2026-06-01T00:00:00.000Z')).toBe(true);
  });
});

describe('upsertRollups (idempotent)', () => {
  it('re-upserting the same bucket updates in place, not duplicates', () => {
    db.insert(agentRunStats).values({ id: 'r1', taskId: 't1', startedAt: '2026-06-01T14:05:00.000Z', endedAt: '2026-06-01T14:06:00.000Z', durationMs: 60000, outcome: 'done', retryCount: 0, repo: 'web' }).run();
    const win = ['2026-06-01T00:00:00.000Z', '2026-06-02T00:00:00.000Z'] as const;

    repo.upsertRollups(finalize(repo.aggregateForRollup('hourly', ...win)));
    // A second run arrives in the same bucket; re-aggregate + re-upsert.
    db.insert(agentRunStats).values({ id: 'r2', taskId: 't2', startedAt: '2026-06-01T14:30:00.000Z', endedAt: '2026-06-01T14:31:00.000Z', durationMs: 30000, outcome: 'done', retryCount: 0, repo: 'web' }).run();
    repo.upsertRollups(finalize(repo.aggregateForRollup('hourly', ...win)));

    const rows = repo.listRollups('hourly', ...win, 'runs');
    expect(rows).toHaveLength(1); // upserted in place
    expect(rows[0]!.runCount).toBe(2); // reflects the latest aggregate
  });
});

describe('pruneRawBefore', () => {
  it('deletes raw rows older than the cutoff across all four tables, keeps newer', () => {
    db.insert(agentRunStats).values([
      { id: 'old', taskId: 't', startedAt: '2026-01-01T00:00:00.000Z', outcome: 'done', retryCount: 0, repo: 'web' },
      { id: 'new', taskId: 't', startedAt: '2026-06-01T00:00:00.000Z', outcome: 'done', retryCount: 0, repo: 'web' },
    ]).run();
    db.insert(gaugeSamples).values({ id: 'gold', at: '2026-01-01T00:00:00.000Z', queueDepth: 1, slotsUsed: 0, slotsTotal: 4, tickLatencyMs: 1 }).run();

    const deleted = repo.pruneRawBefore('2026-03-01T00:00:00.000Z');
    expect(deleted.agentRunStats).toBe(1);
    expect(deleted.gaugeSamples).toBe(1);
    // The newer run survives.
    expect(repo.aggregateForRollup('daily', '2026-05-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z').some((r) => r.source === 'runs')).toBe(true);
  });
});

describe('listRollups', () => {
  it('filters by period, window, and source; oldest-first', () => {
    const base: Omit<MetricsRollupInsert, 'key' | 'bucketStart'> = {
      period: 'daily', source: 'runs', repo: 'web', provider: null, model: null, createdAt: 'x',
      runCount: 1, doneCount: 1, abandonedCount: 0, failedCount: 0, cancelledCount: 0, totalDurationMs: 1, retriedRuns: 0,
    };
    const mk = (bucketStart: string): MetricsRollupInsert => ({ ...base, bucketStart, key: `daily|${bucketStart}|runs|web||` });
    repo.upsertRollups([mk('2026-06-02T00:00:00.000Z'), mk('2026-06-01T00:00:00.000Z'), mk('2026-06-03T00:00:00.000Z')]);

    const rows = repo.listRollups('daily', '2026-06-01T00:00:00.000Z', '2026-06-02T23:59:59.000Z', 'runs');
    expect(rows.map((r) => r.bucketStart)).toEqual([
      '2026-06-01T00:00:00.000Z',
      '2026-06-02T00:00:00.000Z',
    ]);
  });
});
