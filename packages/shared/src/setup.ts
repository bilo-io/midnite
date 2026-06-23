import { z } from 'zod';

// Phase 19 Theme A — the single setup-readiness model the gateway computes and
// everything else (first-run wizard, soft nudge banner, ongoing status panel)
// keys off. It is pure aggregation over services that already exist
// (environment/agent-CLI detection, provider credentials, the secret-key
// cipher, loaded config) — no new persistence.

/** The checklist items, in the order a fresh user should work through them. */
export const SETUP_ITEM_IDS = [
  'provider',
  'secret-key',
  'agent-cli',
  'agent-pool',
  'repo',
] as const;
export const SetupItemIdSchema = z.enum(SETUP_ITEM_IDS);
export type SetupItemId = z.infer<typeof SetupItemIdSchema>;

/**
 * Per-item state:
 *   - `ok`      — satisfied.
 *   - `warn`    — usable but recommended (an optional step left undone, or a
 *                 version that's behind but still works). Never blocks `ready`.
 *   - `missing` — a required piece is absent. A `missing` on a `ready`-gating
 *                 item makes the whole install not ready.
 */
export const SETUP_ITEM_STATES = ['ok', 'warn', 'missing'] as const;
export const SetupItemStateSchema = z.enum(SETUP_ITEM_STATES);
export type SetupItemState = z.infer<typeof SetupItemStateSchema>;

export const SetupItemSchema = z.object({
  id: SetupItemIdSchema,
  /** Human label for the checklist row. */
  label: z.string(),
  state: SetupItemStateSchema,
  /** Optional one-line specifics ("anthropic key set", "claude not on PATH"). */
  detail: z.string().optional(),
});
export type SetupItem = z.infer<typeof SetupItemSchema>;

/** The aggregate readiness signal returned by `GET /setup/status`. */
export const SetupStatusSchema = z.object({
  items: z.array(SetupItemSchema),
  /** Derived from the items per {@link isSetupReady}. */
  ready: z.boolean(),
});
export type SetupStatus = z.infer<typeof SetupStatusSchema>;

/**
 * The `ready` rule (Phase 19 Decision §3): the install can actually run agents
 * when a usable **secret key** is present **AND** there's a way to talk to a
 * model — either a provider with a key, or a working agent CLI (CLI-driven
 * providers like `claude` carry their own auth, so the CLI substitutes for a
 * stored provider key).
 *
 * `warn` items (pool not enabled, no repo yet, an outdated-but-working tool) are
 * recommendations, never blockers.
 */
export function isSetupReady(items: readonly SetupItem[]): boolean {
  const stateOf = (id: SetupItemId): SetupItemState | undefined =>
    items.find((item) => item.id === id)?.state;
  const secretReady = stateOf('secret-key') === 'ok';
  const modelReachable = stateOf('provider') === 'ok' || stateOf('agent-cli') === 'ok';
  return secretReady && modelReachable;
}

/** Bounds for the agent-pool size, shared by the wizard slider and the writer. */
export const AGENT_POOL_SIZE_MIN = 1;
export const AGENT_POOL_SIZE_MAX = 16;

/**
 * The wizard's concurrency step writes the agent pool (Phase 19 Theme B,
 * Decision §6 — the minimal config-write path). `pool` sizes the slots,
 * `poolEnabled` toggles autonomous scheduling. Persisted to `midnite.json` and
 * mirrored into the in-memory config so `/setup/status` reflects it at once;
 * the scheduler reads these at boot, so enabling takes effect on the next
 * gateway restart.
 */
export const UpdateAgentPoolRequestSchema = z.object({
  pool: z.number().int().min(AGENT_POOL_SIZE_MIN).max(AGENT_POOL_SIZE_MAX),
  poolEnabled: z.boolean(),
});
export type UpdateAgentPoolRequest = z.infer<typeof UpdateAgentPoolRequestSchema>;
