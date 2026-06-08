import { z } from 'zod';

// Heartbeat cadence bounds, in hours: once an hour at the most frequent, roughly
// once a month at the least. The cadence is user data (stored per primary agent);
// the scheduler's tick interval is separate config.
export const HEARTBEAT_MIN_H = 1;
export const HEARTBEAT_DEFAULT_H = 4;
export const HEARTBEAT_MAX_H = 720; // ~30 days

export const HEARTBEAT_RUN_STATUSES = ['running', 'succeeded', 'failed', 'skipped'] as const;
export const HeartbeatRunStatusSchema = z.enum(HEARTBEAT_RUN_STATUSES);

export const HEARTBEAT_TRIGGER_SOURCES = ['schedule', 'manual'] as const;
export const HeartbeatTriggerSourceSchema = z.enum(HEARTBEAT_TRIGGER_SOURCES);

const HeartbeatIntervalSchema = z.number().int().min(HEARTBEAT_MIN_H).max(HEARTBEAT_MAX_H);

/** The single orchestrator. Its description is the system prompt; the heartbeat
 *  prompt runs on `heartbeatIntervalH` when `heartbeatEnabled`. */
export const PrimaryAgentSchema = z.object({
  name: z.string(),
  description: z.string(),
  heartbeatEnabled: z.boolean(),
  heartbeatPrompt: z.string(),
  heartbeatIntervalH: HeartbeatIntervalSchema,
  /** ISO timestamp of the last heartbeat fire; absent until the first run. */
  lastHeartbeatAt: z.string().optional(),
  updatedAt: z.string(),
});

/** A delegated worker the orchestrator can call on. */
export const SubAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AgentsConfigSchema = z.object({
  primary: PrimaryAgentSchema,
  subAgents: z.array(SubAgentSchema),
});

export const HeartbeatRunSchema = z.object({
  id: z.string(),
  status: HeartbeatRunStatusSchema,
  triggerSource: HeartbeatTriggerSourceSchema,
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  prompt: z.string().optional(),
  output: z.string().optional(),
  error: z.string().optional(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
});

// --- Requests ---

// All fields optional: PUT /agents/primary is a partial patch on the singleton.
export const UpdatePrimaryAgentRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(50000).optional(),
  heartbeatEnabled: z.boolean().optional(),
  heartbeatPrompt: z.string().max(50000).optional(),
  heartbeatIntervalH: HeartbeatIntervalSchema.optional(),
});

// All fields optional so a blank subagent can be created and filled in later;
// the service coalesces missing fields to empty strings.
export const CreateSubAgentRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  role: z.string().trim().max(200).optional(),
  description: z.string().max(50000).optional(),
});

export const UpdateSubAgentRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  role: z.string().trim().max(200).optional(),
  description: z.string().max(50000).optional(),
});

// --- Response envelopes (mirror ProjectResponse) ---

export const AgentsConfigResponseSchema = z.object({ config: AgentsConfigSchema });
export const PrimaryAgentResponseSchema = z.object({ primary: PrimaryAgentSchema });
export const SubAgentResponseSchema = z.object({ subAgent: SubAgentSchema });
export const HeartbeatRunsResponseSchema = z.object({ runs: z.array(HeartbeatRunSchema) });
export const HeartbeatRunResponseSchema = z.object({ run: HeartbeatRunSchema });

export type PrimaryAgent = z.infer<typeof PrimaryAgentSchema>;
export type SubAgent = z.infer<typeof SubAgentSchema>;
export type AgentsConfig = z.infer<typeof AgentsConfigSchema>;
export type HeartbeatRun = z.infer<typeof HeartbeatRunSchema>;
export type HeartbeatRunStatus = z.infer<typeof HeartbeatRunStatusSchema>;
export type HeartbeatTriggerSource = z.infer<typeof HeartbeatTriggerSourceSchema>;
export type UpdatePrimaryAgentRequest = z.infer<typeof UpdatePrimaryAgentRequestSchema>;
export type CreateSubAgentRequest = z.infer<typeof CreateSubAgentRequestSchema>;
export type UpdateSubAgentRequest = z.infer<typeof UpdateSubAgentRequestSchema>;
export type AgentsConfigResponse = z.infer<typeof AgentsConfigResponseSchema>;
export type PrimaryAgentResponse = z.infer<typeof PrimaryAgentResponseSchema>;
export type SubAgentResponse = z.infer<typeof SubAgentResponseSchema>;
export type HeartbeatRunsResponse = z.infer<typeof HeartbeatRunsResponseSchema>;
export type HeartbeatRunResponse = z.infer<typeof HeartbeatRunResponseSchema>;
