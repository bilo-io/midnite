import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  LLM_FEATURE_DEFAULT,
  LlmFeatureSchema,
  LlmProviderSchema,
  type BudgetPeriodStatus,
  type BudgetStatus,
  type LlmFeature,
  type LlmProvider,
  type MidniteConfig,
  type UsageBucket,
  type UsageBudgetWarning,
  type UsageSummaryQuery,
  type UsageSummaryResponse,
  type UsageTotals,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import type { LlmUsageRow } from '../db/schema';
import { estimateCostUsd } from './lib/pricing';
import { UsageRepository } from './usage.repository';

/** What a caller hands to {@link UsageService.record} after an LLM call. */
export interface RecordUsageInput {
  provider: LlmProvider;
  model: string;
  feature: LlmFeature;
  inputTokens: number;
  outputTokens: number;
  correlationId?: string | null;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(UsageRepository) private readonly repo: UsageRepository,
  ) {}

  /**
   * Persist one LLM call's usage + estimated cost. Best-effort: a recording
   * failure must never break the originating feature, so it's logged and
   * swallowed (the LLM call already succeeded).
   */
  record(input: RecordUsageInput): void {
    try {
      const inputTokens = Math.max(0, Math.round(input.inputTokens || 0));
      const outputTokens = Math.max(0, Math.round(input.outputTokens || 0));
      this.repo.insert({
        id: randomUUID(),
        at: new Date().toISOString(),
        provider: input.provider,
        model: input.model,
        feature: input.feature,
        inputTokens,
        outputTokens,
        estCostUsd: estimateCostUsd(input.model, inputTokens, outputTokens, input.provider),
        correlationId: input.correlationId ?? null,
      });
    } catch (err) {
      this.logger.warn(
        `failed to record LLM usage (${input.provider}/${input.model}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /** Aggregate usage in a window into totals + grouped buckets + soft-warnings. */
  summary(query: UsageSummaryQuery): UsageSummaryResponse {
    const rows = this.repo.listInRange(query.from, query.to);
    const totals = sumTotals(rows);
    const byDay = bucketBy(rows, (r) => dayOf(r.at));
    const byProvider = bucketBy(rows, (r) =>
      LlmProviderSchema.catch('anthropic').parse(r.provider),
    );
    const byFeature = bucketBy(rows, (r) =>
      LlmFeatureSchema.catch(LLM_FEATURE_DEFAULT).parse(r.feature),
    );
    const buckets =
      query.groupBy === 'provider' ? byProvider : query.groupBy === 'feature' ? byFeature : byDay;

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      groupBy: query.groupBy,
      totals,
      buckets,
      byProvider,
      byFeature,
      byDay,
      warnings: this.budgetWarnings(rows),
      costIsEstimate: true,
    };
  }

  /**
   * Phase 50 Theme B — the *hard-cap* enforcement view, read by the agent-pool
   * scheduler each tick to decide whether to block spawns. Distinct from the soft
   * {@link budgetWarnings}: this drives a real block, not a warning. Computed from
   * live spend over the current UTC day / month (same window basis as the soft
   * warnings). Returns `over: false` with null periods when no hard cap is set —
   * so the whole feature is inert (and cheap: no query) until a cap is configured.
   */
  checkBudget(): BudgetStatus {
    const { hardDailyCapUsd, hardMonthlyCapUsd } = this.config.usage;
    if (!hardDailyCapUsd && !hardMonthlyCapUsd) {
      return { over: false, daily: null, monthly: null };
    }
    const today = dayOf(new Date().toISOString());
    const month = today.slice(0, 7); // YYYY-MM
    // One query for the whole month covers both the month and (by filter) the day.
    const rows = this.repo.listInRange(`${month}-01T00:00:00.000Z`);
    const monthSpent = sumCost(rows);
    const daySpent = sumCost(rows.filter((r) => dayOf(r.at) === today));
    const period = (capUsd: number | undefined, spentUsd: number): BudgetPeriodStatus | null =>
      capUsd
        ? { capUsd, spentUsd: round6(spentUsd), exceeded: spentUsd >= capUsd }
        : null;
    const daily = period(hardDailyCapUsd, daySpent);
    const monthly = period(hardMonthlyCapUsd, monthSpent);
    return { over: Boolean(daily?.exceeded) || Boolean(monthly?.exceeded), daily, monthly };
  }

  /**
   * Soft-warn (never block) when today's or this-month's spend nears/exceeds a
   * configured budget. Uses the *current* wall clock for the day/month window so
   * warnings reflect live spend regardless of the query range.
   */
  private budgetWarnings(rows: LlmUsageRow[]): UsageBudgetWarning[] {
    const { dailyBudgetUsd, monthlyBudgetUsd, warnAtRatio } = this.config.usage;
    const warnings: UsageBudgetWarning[] = [];
    const now = new Date();
    const today = dayOf(now.toISOString());
    const month = today.slice(0, 7); // YYYY-MM

    if (dailyBudgetUsd) {
      const spent = sumCost(rows.filter((r) => dayOf(r.at) === today));
      const w = warning('day', dailyBudgetUsd, spent, warnAtRatio);
      if (w) warnings.push(w);
    }
    if (monthlyBudgetUsd) {
      const spent = sumCost(rows.filter((r) => dayOf(r.at).startsWith(month)));
      const w = warning('month', monthlyBudgetUsd, spent, warnAtRatio);
      if (w) warnings.push(w);
    }
    return warnings;
  }
}

function warning(
  period: 'day' | 'month',
  budgetUsd: number,
  spentUsd: number,
  warnAtRatio: number,
): UsageBudgetWarning | null {
  const ratio = budgetUsd > 0 ? spentUsd / budgetUsd : 0;
  if (ratio < warnAtRatio) return null; // within budget — no warning
  const exceeded = spentUsd >= budgetUsd;
  const pct = Math.round(ratio * 100);
  const label = period === 'day' ? 'daily' : 'monthly';
  const message = exceeded
    ? `Over the ${label} budget: $${spentUsd.toFixed(2)} of $${budgetUsd.toFixed(2)} (${pct}%). Calls are not blocked.`
    : `Approaching the ${label} budget: $${spentUsd.toFixed(2)} of $${budgetUsd.toFixed(2)} (${pct}%).`;
  return { period, budgetUsd, spentUsd, ratio, exceeded, message };
}

function dayOf(iso: string): string {
  // ISO timestamps sort lexicographically; the date is the first 10 chars.
  return iso.slice(0, 10);
}

function sumCost(rows: LlmUsageRow[]): number {
  return rows.reduce((acc, r) => acc + (r.estCostUsd ?? 0), 0);
}

function sumTotals(rows: LlmUsageRow[]): UsageTotals {
  return rows.reduce<UsageTotals>(
    (acc, r) => ({
      calls: acc.calls + 1,
      inputTokens: acc.inputTokens + r.inputTokens,
      outputTokens: acc.outputTokens + r.outputTokens,
      estCostUsd: round6(acc.estCostUsd + (r.estCostUsd ?? 0)),
    }),
    { calls: 0, inputTokens: 0, outputTokens: 0, estCostUsd: 0 },
  );
}

function bucketBy(rows: LlmUsageRow[], keyOf: (r: LlmUsageRow) => string): UsageBucket[] {
  const map = new Map<string, UsageBucket>();
  for (const r of rows) {
    const key = keyOf(r);
    const cur = map.get(key) ?? { key, calls: 0, inputTokens: 0, outputTokens: 0, estCostUsd: 0 };
    cur.calls += 1;
    cur.inputTokens += r.inputTokens;
    cur.outputTokens += r.outputTokens;
    cur.estCostUsd = round6(cur.estCostUsd + (r.estCostUsd ?? 0));
    map.set(key, cur);
  }
  // Day buckets sort chronologically; provider/feature buckets by spend desc.
  return [...map.values()].sort((a, b) =>
    a.key.length === 10 && b.key.length === 10
      ? a.key.localeCompare(b.key)
      : b.estCostUsd - a.estCostUsd,
  );
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
