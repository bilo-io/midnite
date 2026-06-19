import { z } from 'zod';

import { AgentCliSchema } from './agents.js';

// A brainstorm is a standing panel of AI contributors, each generating ideas on
// a prompt through a fixed *lens* via its provider CLI. Submitting a prompt
// starts a *run*: every contributor produces a one-shot batch of ideas in its
// own terminal, then the attributed ideas are handed to the brainstorm's
// synthesizer, which distills them in a chosen *mode* (shortlist, gaps, market
// opportunities, critique, combine). Unlike a council it is divergent then
// constructively convergent — it generates and analyzes rather than judging a
// winner, so ideas are attributed (never anonymized) and the synthesis mode can
// be switched and re-run over the same captured ideas.

export const BRAINSTORM_RUN_STATUSES = ['running', 'synthesizing', 'completed', 'failed'] as const;
export const BrainstormRunStatusSchema = z.enum(BRAINSTORM_RUN_STATUSES);
export type BrainstormRunStatus = z.infer<typeof BrainstormRunStatusSchema>;

export const BRAINSTORM_CONTRIBUTOR_RUN_STATUSES = [
  'running',
  'succeeded',
  'failed',
  'timeout',
  'skipped',
] as const;
export const BrainstormContributorRunStatusSchema = z.enum(BRAINSTORM_CONTRIBUTOR_RUN_STATUSES);
export type BrainstormContributorRunStatus = z.infer<typeof BrainstormContributorRunStatusSchema>;

// The convergent step's mode: what the synthesizer *does* with the pooled ideas.
// Chosen per run and stored on it, so re-synthesizing in another mode reuses the
// already-captured contributor outputs without re-running idea generation.
export const BRAINSTORM_SYNTH_MODES = [
  'shortlist',
  'gaps',
  'opportunities',
  'critique',
  'combine',
] as const;
export const BrainstormSynthModeSchema = z.enum(BRAINSTORM_SYNTH_MODES);
export type BrainstormSynthMode = z.infer<typeof BrainstormSynthModeSchema>;
export const BRAINSTORM_SYNTH_MODE_DEFAULT: BrainstormSynthMode = 'shortlist';

/** Human label for each synthesis mode, for the run composer + re-synthesis menu. */
export const BRAINSTORM_SYNTH_MODE_LABEL: Record<BrainstormSynthMode, string> = {
  shortlist: 'Shortlist',
  gaps: 'Gap analysis',
  opportunities: 'Market opportunities',
  critique: 'Critique & risks',
  combine: 'Combine into concepts',
};

/** A one-line gloss of each mode, shown under the menu option. */
export const BRAINSTORM_SYNTH_MODE_DESCRIPTION: Record<BrainstormSynthMode, string> = {
  shortlist: 'Cluster, dedupe, and curate the strongest ideas.',
  gaps: 'Surface what nobody explored — blind spots and unexplored directions.',
  opportunities: 'Frame ideas as market opportunities and rank them.',
  critique: 'Stress-test the strongest ideas: strengths, risks, how to improve.',
  combine: 'Merge the best fragments into a few fully-formed concepts.',
};

export const BRAINSTORM_SYNTH_PROVIDER_DEFAULT = 'gemini' as const;

/**
 * Starter lenses seeded into a new brainstorm — diverse, reusable angles that
 * give the panel immediate value and show what a good lens looks like. They are
 * ordinary contributors: the user can edit, reorder, or remove any of them.
 */
export const BRAINSTORM_STARTER_LENSES: ReadonlyArray<{ name: string; lens: string }> = [
  {
    name: 'First principles',
    lens: 'Reason up from the fundamentals — ignore how it is usually done and rebuild from what must be true.',
  },
  {
    name: 'Contrarian',
    lens: 'Argue the non-consensus view. What would most people disagree with that might actually be right?',
  },
  {
    name: 'Customer / JTBD',
    lens: "Start from the customer's job-to-be-done and unmet needs — ideas that remove friction or do the job better.",
  },
  {
    name: 'Moonshot',
    lens: 'Aim for a 10x outcome. Ignore near-term constraints — what would be possible without resource limits?',
  },
];

/** A standing member of a brainstorm: a lens plus the CLI that generates through it. */
export const BrainstormContributorSchema = z.object({
  id: z.string(),
  brainstormId: z.string(),
  name: z.string(),
  provider: AgentCliSchema,
  /** The angle this contributor generates ideas from (e.g. "first principles"). */
  lens: z.string(),
  /** Display/run order within the brainstorm (ascending). Drives the tab order. */
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BrainstormContributor = z.infer<typeof BrainstormContributorSchema>;

export const BrainstormSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  /** The CLI that distills the pooled ideas into the synthesis. */
  synthProvider: AgentCliSchema,
  /** Mode pre-selected for new runs; each run can override it. */
  defaultMode: BrainstormSynthModeSchema,
  contributors: z.array(BrainstormContributorSchema),
  archived: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Brainstorm = z.infer<typeof BrainstormSchema>;

/**
 * A contributor's slice of one run — a snapshot of name/provider/lens at start
 * time, so editing the brainstorm later never rewrites history. Ideas are
 * attributed (no anonymization label, unlike a council participant).
 */
export const BrainstormRunContributorSchema = z.object({
  id: z.string(),
  runId: z.string(),
  contributorId: z.string(),
  name: z.string(),
  provider: AgentCliSchema,
  lens: z.string(),
  status: BrainstormContributorRunStatusSchema,
  /** Attach id for the live terminal while the contributor is running. */
  terminalId: z.string(),
  /** Cleaned (ANSI-stripped) output (the generated ideas), persisted on exit. */
  output: z.string().optional(),
  exitCode: z.number().int().optional(),
  error: z.string().optional(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
});
export type BrainstormRunContributor = z.infer<typeof BrainstormRunContributorSchema>;

/**
 * One completed synthesis of a run's captured ideas, in a given mode. A run
 * accumulates one entry per mode it's been synthesized in, so re-synthesizing in
 * a new mode adds an entry rather than discarding the previous one — letting the
 * UI show, say, the shortlist and the gap analysis side by side.
 */
export const BrainstormSynthesisEntrySchema = z.object({
  mode: BrainstormSynthModeSchema,
  synthesis: z.string(),
  synthProvider: AgentCliSchema.optional(),
  finishedAt: z.string(),
});
export type BrainstormSynthesisEntry = z.infer<typeof BrainstormSynthesisEntrySchema>;

export const BrainstormRunSchema = z.object({
  id: z.string(),
  brainstormId: z.string(),
  prompt: z.string(),
  /** The synthesis mode this run was (last) synthesized in — the active entry. */
  mode: BrainstormSynthModeSchema,
  status: BrainstormRunStatusSchema,
  /** Snapshot of the brainstorm's synthesizer when the run (last) synthesized. */
  synthProvider: AgentCliSchema.optional(),
  /** Attach id for the synthesizer CLI's terminal while status is 'synthesizing'. */
  synthTerminalId: z.string().optional(),
  /** Markdown synthesis for the active `mode` (also the latest entry in `syntheses`). */
  synthesis: z.string().optional(),
  /** All completed syntheses, one per mode (the archive `synthesis` is the active slice of). */
  syntheses: z.array(BrainstormSynthesisEntrySchema).default([]),
  error: z.string().optional(),
  contributors: z.array(BrainstormRunContributorSchema),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
});
export type BrainstormRun = z.infer<typeof BrainstormRunSchema>;

// --- Requests ---

export const CreateBrainstormRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).optional(),
  synthProvider: AgentCliSchema.optional(),
  defaultMode: BrainstormSynthModeSchema.optional(),
});
export type CreateBrainstormRequest = z.infer<typeof CreateBrainstormRequestSchema>;

export const UpdateBrainstormRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  synthProvider: AgentCliSchema.optional(),
  defaultMode: BrainstormSynthModeSchema.optional(),
  archived: z.boolean().optional(),
});
export type UpdateBrainstormRequest = z.infer<typeof UpdateBrainstormRequestSchema>;

// All fields optional so a blank contributor can be added and filled in later
// (mirrors CreateCouncilParticipantRequestSchema); the service coalesces to defaults.
export const CreateBrainstormContributorRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  provider: AgentCliSchema.optional(),
  lens: z.string().max(10000).optional(),
});
export type CreateBrainstormContributorRequest = z.infer<
  typeof CreateBrainstormContributorRequestSchema
>;

export const UpdateBrainstormContributorRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  provider: AgentCliSchema.optional(),
  lens: z.string().max(10000).optional(),
});
export type UpdateBrainstormContributorRequest = z.infer<
  typeof UpdateBrainstormContributorRequestSchema
>;

/** New ordering for a brainstorm's contributors — every contributor id, once. */
export const ReorderBrainstormContributorsRequestSchema = z.object({
  contributorIds: z.array(z.string().min(1)).min(1),
});
export type ReorderBrainstormContributorsRequest = z.infer<
  typeof ReorderBrainstormContributorsRequestSchema
>;

export const StartBrainstormRunRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(20000),
  /** Synthesis mode for this run; defaults to the brainstorm's defaultMode. */
  mode: BrainstormSynthModeSchema.optional(),
});
export type StartBrainstormRunRequest = z.infer<typeof StartBrainstormRunRequestSchema>;

/** Re-synthesize a finished run's captured ideas, optionally switching the mode. */
export const RetryBrainstormSynthesisRequestSchema = z.object({
  mode: BrainstormSynthModeSchema.optional(),
});
export type RetryBrainstormSynthesisRequest = z.infer<
  typeof RetryBrainstormSynthesisRequestSchema
>;

// --- Response envelopes (mirror CouncilResponse) ---

export const BrainstormResponseSchema = z.object({ brainstorm: BrainstormSchema });
export const BrainstormContributorResponseSchema = z.object({
  contributor: BrainstormContributorSchema,
});
export const BrainstormRunResponseSchema = z.object({ run: BrainstormRunSchema });
export const BrainstormRunsResponseSchema = z.object({ runs: z.array(BrainstormRunSchema) });

export type BrainstormResponse = z.infer<typeof BrainstormResponseSchema>;
export type BrainstormContributorResponse = z.infer<typeof BrainstormContributorResponseSchema>;
export type BrainstormRunResponse = z.infer<typeof BrainstormRunResponseSchema>;
export type BrainstormRunsResponse = z.infer<typeof BrainstormRunsResponseSchema>;
