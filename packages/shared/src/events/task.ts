import { z } from 'zod';
import { TaskSchema } from '../task.js';
import { GuardrailSettingsSchema, PauseScopeSchema } from '../guardrails.js';

// Live task-board events published over the gateway WebSocket. The gateway emits
// one on every task state transition (create / update / delete) so clients get
// event-driven board updates instead of polling. Full-object payloads (not just
// ids) so a client can patch its cache without a refetch; the current web client
// just invalidates and refetches, but the contract supports both.
//
// Named `TaskBoardEvent` to avoid colliding with `TaskEvent` (the per-task audit
// timeline entry in `task.ts`) — different concept, both exported from the barrel.
//
// `tasks.bulkCreated` coalesces a bulk add (Phase 16) into ONE board signal
// carrying the new ids, instead of N `task.created` events that each trigger a
// refetch — the client invalidates once for the whole batch.
// Agent activity / attention events piggyback on the same /ws/tasks socket
// (Decision §1 from Phase 31) so the office and CLI dashboard can subscribe
// without opening a second connection. They carry only a short summarized label —
// never raw tool_input (which can hold file contents, secrets, or prompts).
export const AgentActivityEventSchema = z.object({
  type: z.literal('agent.activity'),
  at: z.string(),
  sessionId: z.string(),
  /** Coarse lifecycle phase. */
  phase: z.enum(['running', 'blocked', 'idle']),
  /** Tool name as reported by Claude Code (e.g. "Bash", "Edit"). Optional when idle. */
  tool: z.string().optional(),
  /** One-line human-readable label derived from the tool call. Never raw input. */
  label: z.string().optional(),
});
export type AgentActivityEvent = z.infer<typeof AgentActivityEventSchema>;

export const AgentAttentionEventSchema = z.object({
  type: z.literal('agent.attention'),
  at: z.string(),
  sessionId: z.string(),
  /** Why the agent is blocking on the user. */
  reason: z.enum(['approval', 'waiting']),
  /** Short human-readable summary of what the agent is waiting on. */
  summary: z.string().optional(),
});
export type AgentAttentionEvent = z.infer<typeof AgentAttentionEventSchema>;

// Phase 50 A — the guardrail (pause/kill) state changed. Broadcast to every board
// so it can show/clear a paused banner. `emergencyStop` marks an update that also
// aborted in-flight agents (the pool reacts to this on the same event); the board
// ignores it and just renders from `guardrails`.
export const GuardrailsUpdatedEventSchema = z.object({
  type: z.literal('guardrails.updated'),
  at: z.string(),
  guardrails: GuardrailSettingsSchema,
  emergencyStop: z.boolean().optional(),
  scope: PauseScopeSchema.optional(),
});
export type GuardrailsUpdatedEvent = z.infer<typeof GuardrailsUpdatedEventSchema>;

export const TaskBoardEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('task.created'), at: z.string(), task: TaskSchema }),
  z.object({ type: z.literal('task.updated'), at: z.string(), task: TaskSchema }),
  z.object({ type: z.literal('task.deleted'), at: z.string(), id: z.string() }),
  z.object({ type: z.literal('tasks.bulkCreated'), at: z.string(), taskIds: z.array(z.string()) }),
  AgentActivityEventSchema,
  AgentAttentionEventSchema,
  GuardrailsUpdatedEventSchema,
]);
export type TaskBoardEvent = z.infer<typeof TaskBoardEventSchema>;

// Client → gateway message on the task WS: subscribe to the board's live events.
// Board-wide (no per-task filter) — the kanban renders every task, so one channel
// is simpler than the workflow gateway's per-run subscriptions.
export const TaskSubscribeMessageSchema = z.object({ type: z.literal('subscribe') });
export type TaskSubscribeMessage = z.infer<typeof TaskSubscribeMessageSchema>;

export const TASKS_WS_PATH = '/ws/tasks';
