import { z } from 'zod';

import { AgentCliSchema } from './agents.js';

// A council is a standing panel of AI participants, each arguing a topic from a
// fixed perspective via its provider CLI. Submitting a topic starts a *run*:
// every participant produces a one-shot take in its own terminal, then the
// outputs are anonymized (shuffled, labeled A/B/C…) and synthesized by the
// council's verdict provider into a verdict that weighs the options without
// knowing who said what.

export const COUNCIL_RUN_STATUSES = ['running', 'synthesizing', 'completed', 'failed'] as const;
export const CouncilRunStatusSchema = z.enum(COUNCIL_RUN_STATUSES);
export type CouncilRunStatus = z.infer<typeof CouncilRunStatusSchema>;

export const COUNCIL_PARTICIPANT_RUN_STATUSES = [
  'running',
  'succeeded',
  'failed',
  'timeout',
  'skipped',
] as const;
export const CouncilParticipantRunStatusSchema = z.enum(COUNCIL_PARTICIPANT_RUN_STATUSES);
export type CouncilParticipantRunStatus = z.infer<typeof CouncilParticipantRunStatusSchema>;

/** A standing member of a council: a perspective plus the CLI that argues it. */
export const CouncilParticipantSchema = z.object({
  id: z.string(),
  councilId: z.string(),
  name: z.string(),
  provider: AgentCliSchema,
  perspective: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CouncilParticipant = z.infer<typeof CouncilParticipantSchema>;

export const COUNCIL_VERDICT_PROVIDER_DEFAULT = 'gemini' as const;

export const CouncilSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  /** The CLI that judges the anonymized takes and writes the verdict. */
  verdictProvider: AgentCliSchema,
  participants: z.array(CouncilParticipantSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Council = z.infer<typeof CouncilSchema>;

/**
 * A participant's slice of one run — a snapshot of name/provider/perspective at
 * start time, so editing the council later never rewrites history. `label` is
 * the anonymized identity ('A', 'B', …) assigned at synthesis; persisting it is
 * what lets the UI de-anonymize the verdict afterwards.
 */
export const CouncilRunParticipantSchema = z.object({
  id: z.string(),
  runId: z.string(),
  participantId: z.string(),
  name: z.string(),
  provider: AgentCliSchema,
  perspective: z.string(),
  status: CouncilParticipantRunStatusSchema,
  /** Attach id for the live terminal while the participant is running. */
  terminalId: z.string(),
  /** Cleaned (ANSI-stripped) output, persisted when the process exits. */
  output: z.string().optional(),
  exitCode: z.number().int().optional(),
  error: z.string().optional(),
  label: z.string().optional(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
});
export type CouncilRunParticipant = z.infer<typeof CouncilRunParticipantSchema>;

export const CouncilRunSchema = z.object({
  id: z.string(),
  councilId: z.string(),
  topic: z.string(),
  status: CouncilRunStatusSchema,
  /** Snapshot of the council's verdict provider when the run started. */
  verdictProvider: AgentCliSchema.optional(),
  /** Attach id for the verdict CLI's terminal while status is 'synthesizing'. */
  verdictTerminalId: z.string().optional(),
  /** Markdown verdict from the anonymized synthesis step. */
  verdict: z.string().optional(),
  error: z.string().optional(),
  participants: z.array(CouncilRunParticipantSchema),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
});
export type CouncilRun = z.infer<typeof CouncilRunSchema>;

// --- Requests ---

export const CreateCouncilRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).optional(),
  verdictProvider: AgentCliSchema.optional(),
});
export type CreateCouncilRequest = z.infer<typeof CreateCouncilRequestSchema>;

export const UpdateCouncilRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  verdictProvider: AgentCliSchema.optional(),
});
export type UpdateCouncilRequest = z.infer<typeof UpdateCouncilRequestSchema>;

// All fields optional so a blank participant can be added and filled in later
// (mirrors CreateSubAgentRequestSchema); the service coalesces to defaults.
export const CreateCouncilParticipantRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  provider: AgentCliSchema.optional(),
  perspective: z.string().max(10000).optional(),
});
export type CreateCouncilParticipantRequest = z.infer<
  typeof CreateCouncilParticipantRequestSchema
>;

export const UpdateCouncilParticipantRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  provider: AgentCliSchema.optional(),
  perspective: z.string().max(10000).optional(),
});
export type UpdateCouncilParticipantRequest = z.infer<
  typeof UpdateCouncilParticipantRequestSchema
>;

export const StartCouncilRunRequestSchema = z.object({
  topic: z.string().trim().min(1).max(20000),
});
export type StartCouncilRunRequest = z.infer<typeof StartCouncilRunRequestSchema>;

// --- Response envelopes (mirror ProjectResponse) ---

export const CouncilResponseSchema = z.object({ council: CouncilSchema });
export const CouncilParticipantResponseSchema = z.object({
  participant: CouncilParticipantSchema,
});
export const CouncilRunResponseSchema = z.object({ run: CouncilRunSchema });
export const CouncilRunsResponseSchema = z.object({ runs: z.array(CouncilRunSchema) });

export type CouncilResponse = z.infer<typeof CouncilResponseSchema>;
export type CouncilParticipantResponse = z.infer<typeof CouncilParticipantResponseSchema>;
export type CouncilRunResponse = z.infer<typeof CouncilRunResponseSchema>;
export type CouncilRunsResponse = z.infer<typeof CouncilRunsResponseSchema>;
