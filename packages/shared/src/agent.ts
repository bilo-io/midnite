import { z } from 'zod';

/** Result of a lightweight AI health check (`POST /agent/ping`). */
export const AgentPingResponseSchema = z.object({
  /** True when the AI responded; false when disabled (no creds) or the call failed. */
  ok: z.boolean(),
  /** The resolved model id the gateway called (empty when AI is disabled). */
  model: z.string(),
  /** The model's self-reported status line, or an explanatory message on failure. */
  reply: z.string(),
});

export type AgentPingResponse = z.infer<typeof AgentPingResponseSchema>;
