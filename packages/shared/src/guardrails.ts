import { z } from 'zod';

// Phase 50 Theme A — kill switch & global pause. Guardrail state is DB-backed
// (persisted in the approval_settings singleton) so an emergency stop survives a
// gateway restart — never config-only. The scheduler reads it every tick and
// spawns nothing for a paused scope; an emergency stop additionally aborts
// in-flight agents (requeued to `todo`, not abandoned — Decision §A).

/**
 * What a pause/stop applies to. `global` halts all scheduling; `repo`/`team`
 * halt only tasks in that scope (a task's `repo` / `teamId`). Single-target so a
 * toggle add/removes exactly one id from the paused set (`global` toggles a bool).
 */
export const PauseScopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('global') }),
  z.object({ kind: z.literal('repo'), id: z.string().min(1) }),
  z.object({ kind: z.literal('team'), id: z.string().min(1) }),
]);
export type PauseScope = z.infer<typeof PauseScopeSchema>;

/** The persisted guardrail state (the pause half of the safety domain). */
export const GuardrailSettingsSchema = z.object({
  /** Global kill switch — when true, nothing is scheduled anywhere. */
  pausedGlobal: z.boolean(),
  /** Repo refs (task.repo) whose scheduling is paused. */
  pausedRepos: z.array(z.string()),
  /** Team ids (task.teamId) whose scheduling is paused. */
  pausedTeams: z.array(z.string()),
  /** Who last changed pause state, and when (ISO). Null before any change. */
  pausedBy: z.string().nullable(),
  pausedAt: z.string().nullable(),
});
export type GuardrailSettings = z.infer<typeof GuardrailSettingsSchema>;

/** Toggle a scope's pause. `paused:false` resumes (soft — running agents finish). */
export const PauseRequestSchema = z.object({
  scope: PauseScopeSchema,
  paused: z.boolean(),
});
export type PauseRequest = z.infer<typeof PauseRequestSchema>;

/** Emergency stop: pause a scope AND abort its in-flight agents (requeued). */
export const EmergencyStopRequestSchema = z.object({
  scope: PauseScopeSchema.default({ kind: 'global' }),
});
export type EmergencyStopRequest = z.infer<typeof EmergencyStopRequestSchema>;

export const GuardrailsResponseSchema = z.object({ guardrails: GuardrailSettingsSchema });
export type GuardrailsResponse = z.infer<typeof GuardrailsResponseSchema>;

/** True when the given task's scope is paused (global short-circuits). */
export function isTaskPaused(
  settings: GuardrailSettings,
  task: { repo?: string | null; teamId?: string | null },
): boolean {
  if (settings.pausedGlobal) return true;
  if (task.repo && settings.pausedRepos.includes(task.repo)) return true;
  if (task.teamId && settings.pausedTeams.includes(task.teamId)) return true;
  return false;
}
