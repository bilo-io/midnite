import { z } from 'zod';
import { TaskSchema } from '../task.js';

// Live task-board events published over the gateway WebSocket. The gateway emits
// one on every task state transition (create / update / delete) so clients get
// event-driven board updates instead of polling. Full-object payloads (not just
// ids) so a client can patch its cache without a refetch; the current web client
// just invalidates and refetches, but the contract supports both.
//
// Named `TaskBoardEvent` to avoid colliding with `TaskEvent` (the per-task audit
// timeline entry in `task.ts`) — different concept, both exported from the barrel.
export const TaskBoardEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('task.created'), at: z.string(), task: TaskSchema }),
  z.object({ type: z.literal('task.updated'), at: z.string(), task: TaskSchema }),
  z.object({ type: z.literal('task.deleted'), at: z.string(), id: z.string() }),
]);
export type TaskBoardEvent = z.infer<typeof TaskBoardEventSchema>;

// Client → gateway message on the task WS: subscribe to the board's live events.
// Board-wide (no per-task filter) — the kanban renders every task, so one channel
// is simpler than the workflow gateway's per-run subscriptions.
export const TaskSubscribeMessageSchema = z.object({ type: z.literal('subscribe') });
export type TaskSubscribeMessage = z.infer<typeof TaskSubscribeMessageSchema>;

export const TASKS_WS_PATH = '/ws/tasks';
