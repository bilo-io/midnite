import { z } from 'zod';

/**
 * Real, harvested token usage for one agent session (Phase 61 A). Populated from
 * the Claude Code transcript's `message.usage` records (input/output/cache token
 * counts + model) at Stop-hook time; keyed by the midnite session id (= task id).
 *
 * This is the **measured** counterpart to the hash-seeded `contextTokens`
 * placeholder the session cockpit used to show — the P51 honesty contract holds:
 * a figure here is real (`measured: true`), and sessions with no harvested row
 * fall back to the labeled estimate. Theme B layers cost attribution (groupBy
 * task/repo/project) on top of this table.
 */
export const SessionUsageSchema = z.object({
  /** midnite session id === linked task id. */
  sessionId: z.string(),
  /** Agent CLI that produced the transcript (claude | gemini | …), when known. */
  agentCli: z.string().optional(),
  /** Concrete model id from the transcript (e.g. `claude-sonnet-4-6`), when known. */
  model: z.string().optional(),
  /** Summed non-cached input tokens across the session's assistant turns. */
  inputTokens: z.number().int().nonnegative(),
  /** Summed output tokens across the session's assistant turns. */
  outputTokens: z.number().int().nonnegative(),
  /** Summed cache-read input tokens (billed at a reduced rate). */
  cachedReadTokens: z.number().int().nonnegative(),
  /** Summed cache-creation input tokens (billed at a premium). */
  cachedWriteTokens: z.number().int().nonnegative(),
  /**
   * Context-window occupancy from the **final** assistant turn
   * (input + cache-read + cache-creation) — how much of the window was in use,
   * the honest replacement for the old hash-seeded gauge value.
   */
  contextTokens: z.number().int().nonnegative(),
  /** Estimated USD cost; `null` when the model is unpriced (tokens still shown). */
  estCostUsd: z.number().nonnegative().nullable(),
  /** Always true for a harvested row — distinguishes it from the labeled estimate. */
  measured: z.boolean(),
  /** ISO timestamp of the last harvest for this session. */
  updatedAt: z.string(),
});
export type SessionUsage = z.infer<typeof SessionUsageSchema>;
