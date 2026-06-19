import { describe, expect, it } from 'vitest';
import type { MidniteConfig, UsageConfig } from '@midnite/shared';
import type { LlmUsageRow, LlmUsageInsert } from '../db/schema';
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

function makeService(usage: UsageConfig, seed: Partial<LlmUsageRow>[] = []) {
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
  return { repo, service: new UsageService(config, repo) };
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
