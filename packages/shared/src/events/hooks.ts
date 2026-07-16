import { z } from 'zod';

// ---- Lifecycle hook bridge (Claude Code hook scripts <-> gateway, REST) ----
//
// Mirrors the PreToolUse bridge in ./terminal.ts, but for the Stop and
// Notification hooks that drive task status transitions (wip → done / waiting).
// Both POST Claude Code's hook stdin payload to the gateway, authenticated by
// the same per-session secret header. Kept permissive (`.passthrough()`) because
// Claude Code's payload shape can drift; we only read the fields we map on.

/**
 * Body posted by the Stop hook. Claude Code fires Stop at the end of every
 * agent turn (not only at task completion), so `stop_hook_active` and the
 * transcript are what let the gateway decide whether the task is actually done.
 */
export const StopHookRequestSchema = z
  .object({
    session_id: z.string().optional(),
    transcript_path: z.string().optional(),
    cwd: z.string().optional(),
    stop_hook_active: z.boolean().optional(),
  })
  .passthrough();
export type StopHookRequest = z.infer<typeof StopHookRequestSchema>;

/** Body posted by the Notification hook (agent is blocked waiting on the user). */
export const NotificationHookRequestSchema = z
  .object({
    session_id: z.string().optional(),
    transcript_path: z.string().optional(),
    cwd: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();
export type NotificationHookRequest = z.infer<typeof NotificationHookRequestSchema>;

/**
 * Body posted by the UserPromptSubmit hook (Phase 69 B). Claude Code fires this
 * when a new prompt is submitted to an active session — the missing resume
 * signal that drives `waiting → wip`. Kept permissive (`.passthrough()`) like the
 * other hook bridges; the gateway keys only off the session (via the URL + secret
 * header), so no field here is required to be trusted.
 */
export const UserPromptSubmitHookRequestSchema = z
  .object({
    session_id: z.string().optional(),
    transcript_path: z.string().optional(),
    cwd: z.string().optional(),
    prompt: z.string().optional(),
  })
  .passthrough();
export type UserPromptSubmitHookRequest = z.infer<typeof UserPromptSubmitHookRequestSchema>;

/** Fire-and-forget acknowledgement returned to the hook script. */
export const HookAckSchema = z.object({
  ok: z.boolean(),
});
export type HookAck = z.infer<typeof HookAckSchema>;
