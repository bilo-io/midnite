import { z } from 'zod';
import { AgentSlotSchema } from './task.js';

// A point-in-time view of the gateway's agent pool: the in-memory slots plus
// the headline counts the board/CLI render. Slots are not persisted — they're
// re-derived from tasks on restart — so this is purely a read model.
export const AgentPoolSnapshotSchema = z.object({
  slots: z.array(AgentSlotSchema),
  capacity: z.number().int().nonnegative(),
  busy: z.number().int().nonnegative(),
  queuedTodo: z.number().int().nonnegative(),
});
export type AgentPoolSnapshot = z.infer<typeof AgentPoolSnapshotSchema>;
