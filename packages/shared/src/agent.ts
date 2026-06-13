import { z } from 'zod';
import { AgentCliSchema } from './agents.js';

/** Result of a lightweight health check (`POST /agents/ping`) against the selected CLI. */
export const AgentPingResponseSchema = z.object({
  /** True when the agent responded / its CLI is installed; false when disabled or absent. */
  ok: z.boolean(),
  /** The CLI that was pinged (the global preference). */
  cli: AgentCliSchema,
  /** Claude: the resolved model id. Other CLIs: the agent label (+ version). */
  model: z.string(),
  /** A short status line, or an explanatory message on failure. */
  reply: z.string(),
});

export type AgentPingResponse = z.infer<typeof AgentPingResponseSchema>;
