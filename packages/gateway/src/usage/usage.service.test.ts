import { describe, expect, it } from 'vitest';
import type { MidniteConfig, UsageConfig } from '@midnite/shared';
import type { LlmUsageRow, LlmUsageInsert } from '../db/schema';
import type { SessionUsageAttributionRow } from '../sessions/session-usage.repository';
import type { SessionUsageService } from '../sessions/session-usage.service';
import { UsageRepository } from './usage.repository';
import { UsageService } from './usage.service';

// In-memory fake of the repo so the service is tested without SQLite.
class FakeRepo extends UsageRepository {
  rows: LlmUsageRow[] = [];
  constructor() {
    super({} as never);
  }
  override insert(row: LlmUsageInsert): void {
    this.rows.push({ correlationId: null, ...row } as LlmUsageRow);
  }
  override listInRange(from?: string, to?: string): LlmUsageRow[] {
    return this.rows.filter((r) => (!from || r.at >= from) && (!to || r.at <= to));
  }
}

// Minimal fake of the sessions module's SessionUsageService — only the one
// method UsageService calls for cost attribution (Phase 61 B).
function fakeSessionUsage(rows: SessionUsageAttributionRow[] = []): SessionUsageService {
  return {
    listAttributionInRange: (from?: string, to?: string) =>
      rows.filter((r) => (!from || r.updatedAt >= from) && (!to || r.updatedAt <= to)),
  } as unknown as SessionUsageService;
}

function sessionRow(over: Partial<SessionUsageAttributionRow> = {}): SessionUsageAttributionRow {
  return {
    sessionId: 't1',
    taskTitle: 'Task one',
    repo: 'midnite',
    projectId: 'proj-1',
    model: 'claude-opus-4-8',
    inputTokens: 100,
    outputTokens: 40,
    cachedReadTokens: 10,
    cachedWriteTokens: 5,
    estCostUsd: 1,
    updatedAt: '2026-06-19T12:00:00.000Z',
    ...over,
  };
}

function makeService(
  usage: UsageConfig,
  seed: Partial<LlmUsageRow>[] = [],
  sessionSeed: SessionUsageAttributionRow[] = [],
) {
  const repo = new FakeRepo();
  const config = { usage } as MidniteConfig;
  for (const s of seed) {
    repo.rows.push({
      id: Math.random().toString(36),
      at: '2026-06-19T12:00:00.000Z',
      provider: 'anthropic',
      model: 'claude-opus-4-8',
      feature: 'classifier',
      inputTokens: 0,
      outputTokens: 0,
      estCostUsd: 0,
      correlationId: null,
      ...s,
    } as LlmUsageRow);
  }
  return { repo, service: new UsageService(config, repo, fakeSessionUsage(sessionSeed)) };
}

const today = new Date().toISOString().slice(0, 10);

describe('UsageService', () => {
  it('records a row with an estimated cost from the price table', () => {
    const { repo, service } = makeService({ warnAtRatio: 0.8 });
    service.record({
      provider: 'anthropic',
      model: 'claude-opus-4-8',
      feature: 'planner',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]?.estCostUsd).toBeCloseTo(90, 6); // opus 15+75 per M
    expect(repo.rows[0]?.feature).toBe('planner');
  });

  it('aggregates totals and groups by provider/feature/day', () => {
    const { service } = makeService({ warnAtRatio: 0.8 }, [
      { provider: 'anthropic', feature: 'classifier', inputTokens: 100, outputTokens: 50, estCostUsd: 1, at: '2026-06-18T10:00:00.000Z' },
      { provider: 'openai', feature: 'planner', inputTokens: 200, outputTokens: 60, estCostUsd: 2, at: '2026-06-19T10:00:00.000Z' },
      { provider: 'openai', feature: 'planner', inputTokens: 50, outputTokens: 10, estCostUsd: 0.5, at: '2026-06-19T11:00:00.000Z' },
    ]);
    const summary = service.summary({ groupBy: 'provider' });

    expect(summary.totals.calls).toBe(3);
    expect(summary.totals.inputTokens).toBe(350);
    expect(summary.totals.estCostUsd).toBeCloseTo(3.5, 6);

    const openai = summary.byProvider.find((b) => b.key === 'openai');
    expect(openai?.calls).toBe(2);
    expect(openai?.estCostUsd).toBeCloseTo(2.5, 6);

    expect(summary.byFeature.find((b) => b.key === 'planner')?.calls).toBe(2);
    expect(summary.byDay).toHaveLength(2); // two distinct days
    expect(summary.buckets).toBe(summary.byProvider); // groupBy=provider
    expect(summary.costIsEstimate).toBe(true);
  });

  it('soft-warns when spend crosses the warn threshold but stays under budget', () => {
    const { service } = makeService({ dailyBudgetUsd: 10, warnAtRatio: 0.8 }, [
      { estCostUsd: 8.5, at: `${today}T09:00:00.000Z` }, // 85% of $10
    ]);
    const { warnings } = service.summary({ groupBy: 'day' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.period).toBe('day');
    expect(warnings[0]?.exceeded).toBe(false);
    expect(warnings[0]?.message).toMatch(/Approaching/);
  });

  it('flags exceeded once spend passes budget (never blocks)', () => {
    const { service } = makeService({ dailyBudgetUsd: 10, warnAtRatio: 0.8 }, [
      { estCostUsd: 12, at: `${today}T09:00:00.000Z` },
    ]);
    const { warnings } = service.summary({ groupBy: 'day' });
    expect(warnings[0]?.exceeded).toBe(true);
    expect(warnings[0]?.message).toMatch(/Over the daily budget/);
    expect(warnings[0]?.message).toMatch(/not blocked/);
  });

  it('emits no warning while under the threshold', () => {
    const { service } = makeService({ dailyBudgetUsd: 10, warnAtRatio: 0.8 }, [
      { estCostUsd: 2, at: `${today}T09:00:00.000Z` },
    ]);
    expect(service.summary({ groupBy: 'day' }).warnings).toHaveLength(0);
  });

  it('emits no warning when no budget is configured', () => {
    const { service } = makeService({ warnAtRatio: 0.8 }, [
      { estCostUsd: 9999, at: `${today}T09:00:00.000Z` },
    ]);
    expect(service.summary({ groupBy: 'day' }).warnings).toHaveLength(0);
  });
});

describe('UsageService.checkBudget (Phase 50 B — hard caps)', () => {
  it('is inert (not over, null periods) when no hard cap is set', () => {
    const { service } = makeService({ warnAtRatio: 0.8 }, [{ estCostUsd: 9999, at: `${today}T09:00:00.000Z` }]);
    expect(service.checkBudget()).toEqual({ over: false, daily: null, monthly: null });
  });

  it('flags over when today spend meets/exceeds the hard daily cap', () => {
    const { service } = makeService({ warnAtRatio: 0.8, hardDailyCapUsd: 10 }, [
      { estCostUsd: 6, at: `${today}T08:00:00.000Z` },
      { estCostUsd: 5, at: `${today}T09:00:00.000Z` },
    ]);
    const status = service.checkBudget();
    expect(status.over).toBe(true);
    expect(status.daily).toEqual({ capUsd: 10, spentUsd: 11, exceeded: true });
    expect(status.monthly).toBeNull();
  });

  it('is under the cap when today spend is below it', () => {
    const { service } = makeService({ warnAtRatio: 0.8, hardDailyCapUsd: 10 }, [
      { estCostUsd: 4, at: `${today}T08:00:00.000Z` },
    ]);
    const status = service.checkBudget();
    expect(status.over).toBe(false);
    expect(status.daily?.exceeded).toBe(false);
  });

  it('enforces the monthly cap over the whole calendar month', () => {
    const month = today.slice(0, 7);
    const { service } = makeService({ warnAtRatio: 0.8, hardMonthlyCapUsd: 100 }, [
      { estCostUsd: 60, at: `${month}-02T09:00:00.000Z` },
      { estCostUsd: 50, at: `${today}T09:00:00.000Z` },
    ]);
    const status = service.checkBudget();
    expect(status.over).toBe(true);
    expect(status.monthly?.spentUsd).toBe(110);
  });

  it('leaves hard caps LLM-only — harvested session cost never blocks (Phase 61 B)', () => {
    const { service } = makeService(
      { warnAtRatio: 0.8, hardDailyCapUsd: 10 },
      [{ estCostUsd: 4, at: `${today}T08:00:00.000Z` }],
      [sessionRow({ estCostUsd: 100, updatedAt: `${today}T09:00:00.000Z` })],
    );
    const status = service.checkBudget();
    expect(status.over).toBe(false); // $4 LLM only; the $100 session is ignored by hard caps
    expect(status.daily?.spentUsd).toBe(4);
  });
});

describe('UsageService cost attribution (Phase 61 B)', () => {
  it('reports the window spend composition (LLM vs. measured session cost)', () => {
    const { service } = makeService(
      { warnAtRatio: 0.8 },
      [{ estCostUsd: 2, at: '2026-06-19T09:00:00.000Z' }],
      [
        sessionRow({ sessionId: 't1', estCostUsd: 1.5 }),
        sessionRow({ sessionId: 't2', estCostUsd: null }), // unpriced model
      ],
    );
    const { composition } = service.summary({ groupBy: 'day' });
    expect(composition.llmUsd).toBeCloseTo(2, 6);
    expect(composition.sessionMeasuredUsd).toBeCloseTo(1.5, 6);
    expect(composition.sessionEstimatedUsd).toBe(0);
    expect(composition.unpricedSessions).toBe(1);
  });

  it('folds harvested session cost into soft budget warnings', () => {
    const { service } = makeService(
      { dailyBudgetUsd: 10, warnAtRatio: 0.8 },
      [{ estCostUsd: 3, at: `${today}T09:00:00.000Z` }],
      [sessionRow({ estCostUsd: 6, updatedAt: `${today}T10:00:00.000Z` })],
    );
    const { warnings } = service.summary({ groupBy: 'day' });
    // $3 LLM + $6 session = $9 of $10 ⇒ over the 80% warn threshold, not exceeded.
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.exceeded).toBe(false);
    expect(warnings[0]?.message).toMatch(/9\.00 of \$10/);
  });

  it('groups attribution by repo with a measured/estimated split and cost-desc order', () => {
    const { service } = makeService({ warnAtRatio: 0.8 }, [], [
      sessionRow({ sessionId: 't1', repo: 'midnite', estCostUsd: 1 }),
      sessionRow({ sessionId: 't2', repo: 'midnite', estCostUsd: 2 }),
      sessionRow({ sessionId: 't3', repo: 'other', estCostUsd: 5 }),
      sessionRow({ sessionId: 't4', repo: null, estCostUsd: null }), // no repo, unpriced
    ]);
    const res = service.attribution({ groupBy: 'repo' });
    expect(res.buckets.map((b) => b.key)).toEqual(['other', 'midnite', '(unassigned)']);
    const midnite = res.buckets.find((b) => b.key === 'midnite');
    expect(midnite?.sessions).toBe(2);
    expect(midnite?.estCostUsd).toBeCloseTo(3, 6);
    expect(midnite?.measuredCostUsd).toBeCloseTo(3, 6);
    expect(midnite?.cachedTokens).toBe(30); // (10+5) × 2
    const unassigned = res.buckets.find((b) => b.key === '(unassigned)');
    expect(unassigned?.unpricedSessions).toBe(1);
    expect(res.totals.sessions).toBe(4);
    expect(res.totals.estCostUsd).toBeCloseTo(8, 6);
    expect(res.totals.unpricedSessions).toBe(1);
  });

  it('groups by task/session using the session id as key and task title as label', () => {
    const { service } = makeService({ warnAtRatio: 0.8 }, [], [
      sessionRow({ sessionId: 't1', taskTitle: 'Build the thing', estCostUsd: 2 }),
    ]);
    const res = service.attribution({ groupBy: 'task' });
    expect(res.buckets[0]?.key).toBe('t1');
    expect(res.buckets[0]?.label).toBe('Build the thing');
  });

  it('windows attribution by harvest time (updatedAt)', () => {
    const { service } = makeService({ warnAtRatio: 0.8 }, [], [
      sessionRow({ sessionId: 'old', estCostUsd: 1, updatedAt: '2026-05-01T00:00:00.000Z' }),
      sessionRow({ sessionId: 'new', estCostUsd: 3, updatedAt: '2026-06-20T00:00:00.000Z' }),
    ]);
    const res = service.attribution({ groupBy: 'session', from: '2026-06-01T00:00:00.000Z' });
    expect(res.totals.sessions).toBe(1);
    expect(res.buckets[0]?.key).toBe('new');
  });
});
