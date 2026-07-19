import { z } from 'zod';

/**
 * Runtime health contracts (Phase 54 A + B). One check shape drives three
 * surfaces: **boot preflight** (validate the process can run before it binds),
 * the **readiness** endpoint (`/health/ready` — is it serving correctly *now*),
 * and later the **watchdog** + `midnite doctor`. Each check is structured data
 * (name + status + why + how to fix), never an ad-hoc log line.
 */

/** `ok` — healthy · `warn` — degraded but runnable · `fail` — broken. */
export const PreflightStatusSchema = z.enum(['ok', 'warn', 'fail']);
export type PreflightStatus = z.infer<typeof PreflightStatusSchema>;

export const PreflightCheckSchema = z.object({
  /** Stable identifier for the check, e.g. `database`, `agent-cli`. */
  name: z.string(),
  status: PreflightStatusSchema,
  /**
   * Human-readable detail of what was found. Optional because the auth-exempt
   * `/health/preflight` + `/health/ready` probes **redact** `detail` + `remedy`
   * for unauthenticated callers (Phase 72 C) — they'd otherwise disclose provider
   * names + secret env-var names to anyone. Producers (boot preflight, readiness)
   * always set it; only the anonymous HTTP response omits it.
   */
  detail: z.string().optional(),
  /** Actionable remediation when not `ok`. Redacted for anonymous probes (see `detail`). */
  remedy: z.string().optional(),
});
export type PreflightCheck = z.infer<typeof PreflightCheckSchema>;

/**
 * A run of checks + the rolled-up verdict. `ok` is false when any check
 * `fail`ed (or, under `strictBoot`, when any `warn`ed — the caller decides and
 * stamps `ok`). `worst` is the most severe status seen, for a quick summary.
 */
export const PreflightReportSchema = z.object({
  ok: z.boolean(),
  worst: PreflightStatusSchema,
  checks: z.array(PreflightCheckSchema),
});
export type PreflightReport = z.infer<typeof PreflightReportSchema>;

/** Liveness: the process is up. Cheap, dependency-free — never blocks on the DB. */
export const LivenessSchema = z.object({
  ok: z.literal(true),
  uptimeMs: z.number().nonnegative(),
});
export type Liveness = z.infer<typeof LivenessSchema>;

/**
 * Readiness: is the gateway able to *serve* right now (DB reachable, pool up,
 * scheduler running-or-intended, spawner available). Reuses the check shape;
 * `ready` mirrors `ok`. Returned with HTTP 200 when ready, 503 when not.
 */
export const ReadinessSchema = z.object({
  ready: z.boolean(),
  worst: PreflightStatusSchema,
  checks: z.array(PreflightCheckSchema),
  uptimeMs: z.number().nonnegative(),
});
export type Readiness = z.infer<typeof ReadinessSchema>;

/** Roll up a set of checks into the worst status seen (`ok` if empty). */
export function worstStatus(checks: readonly PreflightCheck[]): PreflightStatus {
  let worst: PreflightStatus = 'ok';
  for (const c of checks) {
    if (c.status === 'fail') return 'fail';
    if (c.status === 'warn') worst = 'warn';
  }
  return worst;
}
