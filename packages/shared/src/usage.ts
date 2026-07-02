import { z } from 'zod';
import { LlmProviderSchema } from './llm.js';

// ── LLM usage & cost accounting ──────────────────────────────
// Every call the gateway makes through its own LlmService records one usage row
// (provider, model, feature, token counts, estimated cost). The summary endpoint
// aggregates these by day / provider / feature and soft-warns near a budget.
//
// Cost is a BEST-EFFORT estimate from a static price table (see the gateway's
// pricing module). Treat `estCostUsd` as indicative, never billing-accurate.

// The midnite feature that originated an LLM call, for cost attribution. Kept as
// a string union (not a DB enum) so adding a feature never needs a migration; an
// unrecognised tag falls back to 'unknown'.
export const LLM_FEATURES = [
  'classifier', // task triage (prompt → title/kind)
  'planner', // project/task plan drafting
  'project', // project AI helpers (plan, summarise)
  'agent', // agents/heartbeat runs
  'council', // council member/synthesis runs
  'workflow', // workflow `ai.*` nodes
  'unknown', // untagged / default
] as const;
export const LlmFeatureSchema = z.enum(LLM_FEATURES);
export type LlmFeature = z.infer<typeof LlmFeatureSchema>;
export const LLM_FEATURE_DEFAULT: LlmFeature = 'unknown';

export const LLM_FEATURE_LABEL: Record<LlmFeature, string> = {
  classifier: 'Task triage',
  planner: 'Planner',
  project: 'Projects',
  agent: 'Agents',
  council: 'Councils',
  workflow: 'Workflows',
  unknown: 'Other',
};

/** A single recorded LLM call. Mirrors the gateway `llm_usage` row. */
export const UsageRecordSchema = z.object({
  id: z.string(),
  /** ISO timestamp of the call. */
  at: z.string(),
  provider: LlmProviderSchema,
  model: z.string(),
  feature: LlmFeatureSchema,
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  /** Best-effort USD estimate from the static price table; 0 when unknown. */
  estCostUsd: z.number().nonnegative(),
  /** Optional correlation id (e.g. workflow run / task id) for drill-down. */
  correlationId: z.string().nullable().optional(),
});
export type UsageRecord = z.infer<typeof UsageRecordSchema>;

/** Totals across a window, plus per-token-direction breakdown. */
export const UsageTotalsSchema = z.object({
  calls: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  estCostUsd: z.number().nonnegative(),
});
export type UsageTotals = z.infer<typeof UsageTotalsSchema>;

/** A single grouped bucket (by day, provider, or feature). */
export const UsageBucketSchema = z.object({
  /** The group key: an ISO date (YYYY-MM-DD), a provider id, or a feature id. */
  key: z.string(),
  calls: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  estCostUsd: z.number().nonnegative(),
});
export type UsageBucket = z.infer<typeof UsageBucketSchema>;

export const USAGE_GROUP_BY = ['day', 'provider', 'feature'] as const;
export const UsageGroupBySchema = z.enum(USAGE_GROUP_BY);
export type UsageGroupBy = z.infer<typeof UsageGroupBySchema>;

/** A soft-warn flag surfaced when spend nears/exceeds a configured budget. */
export const UsageBudgetWarningSchema = z.object({
  period: z.enum(['day', 'month']),
  budgetUsd: z.number().nonnegative(),
  spentUsd: z.number().nonnegative(),
  /** spentUsd / budgetUsd, clamped ≥ 0. */
  ratio: z.number().nonnegative(),
  /** True once spend ≥ budget. Advisory only — calls are NEVER blocked. */
  exceeded: z.boolean(),
  message: z.string(),
});
export type UsageBudgetWarning = z.infer<typeof UsageBudgetWarningSchema>;

/** Query for the summary endpoint. `from`/`to` are inclusive ISO timestamps. */
export const UsageSummaryQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  groupBy: UsageGroupBySchema.default('day'),
});
export type UsageSummaryQuery = z.infer<typeof UsageSummaryQuerySchema>;

export const UsageSummaryResponseSchema = z.object({
  /** Echoes the resolved window (defaults applied) for client display. */
  from: z.string().nullable(),
  to: z.string().nullable(),
  groupBy: UsageGroupBySchema,
  totals: UsageTotalsSchema,
  buckets: z.array(UsageBucketSchema),
  /** Always present so the widget can render all three axes without re-querying. */
  byProvider: z.array(UsageBucketSchema),
  byFeature: z.array(UsageBucketSchema),
  byDay: z.array(UsageBucketSchema),
  /** Soft-warn entries (today/this-month over budget). Empty when within budget. */
  warnings: z.array(UsageBudgetWarningSchema),
  /** True when costs are estimates (always, today) — for an "est." UI hint. */
  costIsEstimate: z.boolean(),
});
export type UsageSummaryResponse = z.infer<typeof UsageSummaryResponseSchema>;

// ── Config ───────────────────────────────────────────────────
// Optional soft budgets. When set, the summary endpoint flags spend near/over
// them. Soft budgets TRACK + SOFT-WARN only (phase-7 decision). The `hard*Cap`
// variants (Phase 50 Theme B) are distinct: when a hard cap is exceeded, the
// agent-pool scheduler *blocks* new spawns (the task stays `todo`, re-checked
// next tick) — enforcement, not just a warning. Hard caps are evaluated
// globally (llm_usage carries no repo/team cost attribution today — Decision).
export const UsageConfigSchema = z.object({
  /** Soft daily budget in USD; omit to disable the daily warning. */
  dailyBudgetUsd: z.number().positive().optional(),
  /** Soft monthly budget in USD; omit to disable the monthly warning. */
  monthlyBudgetUsd: z.number().positive().optional(),
  /** Fraction of a budget (0–1) at which to start warning. Default 0.8 (80%). */
  warnAtRatio: z.number().min(0).max(1).default(0.8),
  /** Hard daily spend cap in USD; when today's spend meets/exceeds it the
   *  scheduler blocks new agent spawns. Omit to disable (no hard daily block). */
  hardDailyCapUsd: z.number().positive().optional(),
  /** Hard monthly spend cap in USD; same enforcement over the calendar month. */
  hardMonthlyCapUsd: z.number().positive().optional(),
});
export type UsageConfig = z.infer<typeof UsageConfigSchema>;

/**
 * Live enforcement view of the hard spend caps (Phase 50 Theme B), computed by
 * the gateway's `UsageService.checkBudget()` from today's / this-month's spend.
 * `over` is true when either period cap is met/exceeded — the scheduler blocks
 * spawns while it is. Each period is null when its cap is unset (feature off).
 */
export const BudgetPeriodStatusSchema = z.object({
  capUsd: z.number().positive(),
  spentUsd: z.number().nonnegative(),
  /** True once spend ≥ cap. */
  exceeded: z.boolean(),
});
export type BudgetPeriodStatus = z.infer<typeof BudgetPeriodStatusSchema>;

export const BudgetStatusSchema = z.object({
  /** True when any configured hard cap is met/exceeded (⇒ block spawns). */
  over: z.boolean(),
  daily: BudgetPeriodStatusSchema.nullable(),
  monthly: BudgetPeriodStatusSchema.nullable(),
});
export type BudgetStatus = z.infer<typeof BudgetStatusSchema>;
