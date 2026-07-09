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
  type UsageAttributionBucket,
  type UsageAttributionGroupBy,
  type UsageAttributionQuery,
  type UsageAttributionResponse,
  type UsageAttributionTotals,
  type UsageBucket,
  type UsageBudgetWarning,
  type UsageSpendComposition,
  type UsageSummaryQuery,
  type UsageSummaryResponse,
  type UsageTotals,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import type { LlmUsageRow } from '../db/schema';
import type { SessionUsageAttributionRow } from '../sessions/session-usage.repository';
import { SessionUsageService } from '../sessions/session-usage.service';
import { estimateCostUsd } from './lib/pricing';
import { UsageRepository } from './usage.repository';

const UNASSIGNED_KEY = '(unassigned)';

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
    @Inject(SessionUsageService) private readonly sessionUsage: SessionUsageService,
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
    // Harvested agent-session cost for the same window (Phase 61 B), for the
    // spend composition + budget-warning augmentation. Fail-open: a session-usage
    // read must never break the LLM-usage summary.
    const sessionRows = this.safeSessionRows(query.from, query.to);
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
      warnings: this.budgetWarnings(rows, sessionRows),
      costIsEstimate: true,
      composition: spendComposition(rows, sessionRows),
    };
  }

  /**
   * Phase 61 B — cost attribution. "Which task / repo / project / session spent
   * what?" over the harvested `session_usage` rows (real agent-session token
   * counts) joined to their task for repo/project, windowed by harvest time.
   * Distinct from {@link summary} (which covers the gateway's *own* LLM calls):
   * this is agent-session cost. Buckets carry an honest measured-vs-estimated
   * split + an unpriced-session count.
   */
  attribution(query: UsageAttributionQuery): UsageAttributionResponse {
    const rows = this.safeSessionRows(query.from, query.to);
    const buckets = attributionBuckets(rows, query.groupBy);
    return {
      from: query.from ?? null,
      to: query.to ?? null,
      groupBy: query.groupBy,
      totals: attributionTotals(rows),
      buckets,
    };
  }

  /** Session-usage rows for [from,to], swallowing any read error (fail-open). */
  private safeSessionRows(from?: string, to?: string): SessionUsageAttributionRow[] {
    try {
      return this.sessionUsage.listAttributionInRange(from, to);
    } catch (err) {
      this.logger.warn(
        `failed to read session usage for attribution: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return [];
    }
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
   * warnings reflect live spend regardless of the query range. Since Phase 61 B
   * the spend folds in harvested agent-session cost (windowed by harvest time),
   * not just the gateway's own LLM calls. Note: the *hard* caps in
   * {@link checkBudget} remain LLM-usage-only by design — this is the soft path.
   */
  private budgetWarnings(
    rows: LlmUsageRow[],
    sessionRows: SessionUsageAttributionRow[],
  ): UsageBudgetWarning[] {
    const { dailyBudgetUsd, monthlyBudgetUsd, warnAtRatio } = this.config.usage;
    const warnings: UsageBudgetWarning[] = [];
    const now = new Date();
    const today = dayOf(now.toISOString());
    const month = today.slice(0, 7); // YYYY-MM

    if (dailyBudgetUsd) {
      const spent =
        sumCost(rows.filter((r) => dayOf(r.at) === today)) +
        sumSessionCost(sessionRows.filter((r) => dayOf(r.updatedAt) === today));
      const w = warning('day', dailyBudgetUsd, spent, warnAtRatio);
      if (w) warnings.push(w);
    }
    if (monthlyBudgetUsd) {
      const spent =
        sumCost(rows.filter((r) => dayOf(r.at).startsWith(month))) +
        sumSessionCost(sessionRows.filter((r) => dayOf(r.updatedAt).startsWith(month)));
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

// ── Cost attribution helpers (Phase 61 B) ────────────────────

function sumSessionCost(rows: SessionUsageAttributionRow[]): number {
  return rows.reduce((acc, r) => acc + (r.estCostUsd ?? 0), 0);
}

/** Window spend split: gateway LLM calls vs. measured/estimated session cost. */
function spendComposition(
  llmRows: LlmUsageRow[],
  sessionRows: SessionUsageAttributionRow[],
): UsageSpendComposition {
  // Every harvested row is measured; estimated session cost is 0 today (we only
  // attribute harvested rows) — the field is reserved for a future fallback.
  const sessionMeasuredUsd = round6(sumSessionCost(sessionRows));
  const unpricedSessions = sessionRows.filter((r) => r.estCostUsd == null).length;
  return {
    llmUsd: round6(sumCost(llmRows)),
    sessionMeasuredUsd,
    sessionEstimatedUsd: 0,
    unpricedSessions,
  };
}

/** Which bucket a session row falls into for the requested dimension. */
function attributionKey(
  row: SessionUsageAttributionRow,
  groupBy: UsageAttributionGroupBy,
): { key: string; label: string | null } {
  switch (groupBy) {
    case 'repo':
      return { key: row.repo ?? UNASSIGNED_KEY, label: row.repo ?? null };
    case 'project':
      return { key: row.projectId ?? UNASSIGNED_KEY, label: null };
    case 'task':
    case 'session':
      // The session id === the task id; label with the task title when present.
      return { key: row.sessionId, label: row.taskTitle };
  }
}

function attributionBuckets(
  rows: SessionUsageAttributionRow[],
  groupBy: UsageAttributionGroupBy,
): UsageAttributionBucket[] {
  const map = new Map<string, UsageAttributionBucket>();
  for (const r of rows) {
    const { key, label } = attributionKey(r, groupBy);
    const cur =
      map.get(key) ??
      ({
        key,
        label,
        sessions: 0,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        estCostUsd: 0,
        measuredCostUsd: 0,
        estimatedCostUsd: 0,
        unpricedSessions: 0,
      } satisfies UsageAttributionBucket);
    // Prefer a non-null label if a later row carries one.
    if (cur.label == null && label != null) cur.label = label;
    cur.sessions += 1;
    cur.inputTokens += r.inputTokens;
    cur.outputTokens += r.outputTokens;
    cur.cachedTokens += r.cachedReadTokens + r.cachedWriteTokens;
    const cost = r.estCostUsd ?? 0;
    cur.estCostUsd = round6(cur.estCostUsd + cost);
    cur.measuredCostUsd = round6(cur.measuredCostUsd + cost);
    if (r.estCostUsd == null) cur.unpricedSessions += 1;
    map.set(key, cur);
  }
  // Highest spend first; ties broken by key for a stable order.
  return [...map.values()].sort(
    (a, b) => b.estCostUsd - a.estCostUsd || a.key.localeCompare(b.key),
  );
}

function attributionTotals(rows: SessionUsageAttributionRow[]): UsageAttributionTotals {
  return rows.reduce<UsageAttributionTotals>(
    (acc, r) => {
      const cost = r.estCostUsd ?? 0;
      return {
        sessions: acc.sessions + 1,
        inputTokens: acc.inputTokens + r.inputTokens,
        outputTokens: acc.outputTokens + r.outputTokens,
        cachedTokens: acc.cachedTokens + r.cachedReadTokens + r.cachedWriteTokens,
        estCostUsd: round6(acc.estCostUsd + cost),
        measuredCostUsd: round6(acc.measuredCostUsd + cost),
        estimatedCostUsd: 0,
        unpricedSessions: acc.unpricedSessions + (r.estCostUsd == null ? 1 : 0),
      };
    },
    {
      sessions: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      estCostUsd: 0,
      measuredCostUsd: 0,
      estimatedCostUsd: 0,
      unpricedSessions: 0,
    },
  );
}
