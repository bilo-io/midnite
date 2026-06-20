import { z } from 'zod';

import { AgentCliSchema } from './agents.js';

// A council is a standing panel of AI members, each responding to a prompt from
// a fixed *role* via its provider CLI. Submitting a prompt starts a *run*: every
// member produces a one-shot response in its own terminal, then the captured
// responses are handed to the council's synthesizer, which distils them in a
// chosen *format* (brainstorm, debate, analyse, critique, motivate, demotivate,
// or a custom prompt). The format decides both the synthesis task and whether
// the responses are *attributed* (shown with member names) or *anonymized*
// (shuffled + labeled A/B/C so the synthesis judges them blind). Because
// synthesis runs over already-captured responses, a finished run can be
// re-synthesized in another format without re-running the members — so the same
// panel can be read as a brainstorm, then re-read as a debate verdict.

export const COUNCIL_RUN_STATUSES = ['running', 'synthesizing', 'completed', 'failed'] as const;
export const CouncilRunStatusSchema = z.enum(COUNCIL_RUN_STATUSES);
export type CouncilRunStatus = z.infer<typeof CouncilRunStatusSchema>;

export const COUNCIL_MEMBER_RUN_STATUSES = [
  'running',
  'succeeded',
  'failed',
  'timeout',
  'skipped',
] as const;
export const CouncilMemberRunStatusSchema = z.enum(COUNCIL_MEMBER_RUN_STATUSES);
export type CouncilMemberRunStatus = z.infer<typeof CouncilMemberRunStatusSchema>;

// The synthesis format: what the synthesizer *does* with the pooled responses,
// and whether members are attributed or anonymized first. Chosen per run and
// stored on it, so re-synthesizing in another format reuses the already-captured
// member outputs without re-running them.
export const COUNCIL_FORMATS = [
  'brainstorm',
  'debate',
  'analyse',
  'critique',
  'motivate',
  'demotivate',
  'custom',
] as const;
export const CouncilFormatSchema = z.enum(COUNCIL_FORMATS);
export type CouncilFormat = z.infer<typeof CouncilFormatSchema>;
export const COUNCIL_FORMAT_DEFAULT: CouncilFormat = 'brainstorm';

/**
 * Display + behaviour metadata for each format. `iconKey` is a string (shared is
 * UI-library-free) the web maps to a lucide icon; `anonymize` is read by both the
 * runner (to shuffle + label before synthesis) and the UI (to show a label
 * legend), so it lives here rather than only in the gateway. The synthesis *task*
 * text itself lives in the gateway prompt builder.
 */
export type CouncilFormatMeta = {
  key: CouncilFormat;
  label: string;
  description: string;
  iconKey: string;
  /** Shuffle + label members A/B/C and synthesize blind (vs. attribute by name). */
  anonymize: boolean;
};

export const COUNCIL_FORMATS_META: Record<CouncilFormat, CouncilFormatMeta> = {
  brainstorm: {
    key: 'brainstorm',
    label: 'Brainstorm',
    description: 'Generate ideas, then cluster and curate the strongest.',
    iconKey: 'lightbulb',
    anonymize: false,
  },
  debate: {
    key: 'debate',
    label: 'Debate',
    description: 'Weigh anonymized positions into a single verdict.',
    iconKey: 'swords',
    anonymize: true,
  },
  analyse: {
    key: 'analyse',
    label: 'Analyse',
    description: 'Neutral analysis of themes, agreements, and tensions.',
    iconKey: 'microscope',
    anonymize: false,
  },
  critique: {
    key: 'critique',
    label: 'Critique',
    description: 'Impartially stress-test each position — strengths and risks.',
    iconKey: 'shield-alert',
    anonymize: true,
  },
  motivate: {
    key: 'motivate',
    label: 'Motivate',
    description: 'Build the strongest optimistic case and a path forward.',
    iconKey: 'rocket',
    anonymize: false,
  },
  demotivate: {
    key: 'demotivate',
    label: 'Demotivate',
    description: 'A skeptical pre-mortem — surface every reason it fails.',
    iconKey: 'cloud-rain',
    anonymize: false,
  },
  custom: {
    key: 'custom',
    label: 'Custom',
    description: 'Write your own synthesis prompt.',
    iconKey: 'sliders',
    anonymize: false,
  },
};

export const COUNCIL_SYNTH_PROVIDER_DEFAULT = 'gemini' as const;

/**
 * Starter members seeded into a new council — diverse, reusable roles that give
 * the panel immediate value and show what a good role looks like. They are
 * ordinary members: the user can edit, reorder, or remove any of them.
 */
export const COUNCIL_STARTER_MEMBERS: ReadonlyArray<{ name: string; role: string }> = [
  {
    name: 'Optimist',
    role: 'Make the strongest case in favour. Surface the upside, the momentum, and why this can work.',
  },
  {
    name: 'Skeptic',
    role: 'Argue the contrary view. Probe the assumptions, the risks, and the reasons this might fail.',
  },
  {
    name: 'Pragmatist',
    role: 'Focus on feasibility, cost, and execution — what would it actually take to do this well?',
  },
  {
    name: 'Visionary',
    role: 'Reason from first principles and aim high. Ignore convention — what would a 10x outcome look like?',
  },
];

/** A standing member of a council: a role plus the CLI that responds through it. */
export const CouncilMemberSchema = z.object({
  id: z.string(),
  councilId: z.string(),
  name: z.string(),
  provider: AgentCliSchema,
  /** The angle this member responds from (e.g. "argue the contrary view"). */
  role: z.string(),
  /** Display/run order within the council (ascending). Drives the tab order. */
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CouncilMember = z.infer<typeof CouncilMemberSchema>;

export const CouncilSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  /** The CLI that distils the pooled responses into the synthesis. */
  synthProvider: AgentCliSchema,
  /** Format pre-selected for new runs; each run can override it. */
  defaultFormat: CouncilFormatSchema,
  /** The reusable synthesis prompt used when a run's format is 'custom'. */
  customPrompt: z.string().optional(),
  members: z.array(CouncilMemberSchema),
  /** Number of consultations (runs) this council has had. Populated in list
   *  responses; absent on writes. */
  consultationCount: z.number().int().nonnegative().optional(),
  archived: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Council = z.infer<typeof CouncilSchema>;

/**
 * A member's slice of one run — a snapshot of name/provider/role at start time,
 * so editing the council later never rewrites history. Responses always store
 * the member's identity and raw output; anonymization (labels A/B/C) is applied
 * at synthesis time, not here, so the same run can be re-synthesized attributed
 * or anonymized.
 */
export const CouncilRunMemberSchema = z.object({
  id: z.string(),
  runId: z.string(),
  memberId: z.string(),
  name: z.string(),
  provider: AgentCliSchema,
  role: z.string(),
  status: CouncilMemberRunStatusSchema,
  /** Attach id for the live terminal while the member is running. */
  terminalId: z.string(),
  /** Cleaned (ANSI-stripped) output, persisted when the process exits. */
  output: z.string().optional(),
  exitCode: z.number().int().optional(),
  error: z.string().optional(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
});
export type CouncilRunMember = z.infer<typeof CouncilRunMemberSchema>;

/**
 * One completed synthesis of a run's captured responses, in a given format. A run
 * accumulates one entry per format it's been synthesized in, so re-synthesizing in
 * a new format adds an entry rather than discarding the previous one — letting the
 * UI show, say, the brainstorm and the debate verdict side by side. For an
 * anonymized format, `labelMap` records the label→runMemberId mapping used for
 * that synthesis, so the UI can de-anonymize it afterwards.
 */
export const CouncilSynthesisEntrySchema = z.object({
  format: CouncilFormatSchema,
  synthesis: z.string(),
  synthProvider: AgentCliSchema.optional(),
  /** Whether members were anonymized for this synthesis. */
  anonymized: z.boolean().default(false),
  /** label ('A', 'B', …) → runMemberId, present iff `anonymized`. */
  labelMap: z.record(z.string(), z.string()).optional(),
  finishedAt: z.string(),
});
export type CouncilSynthesisEntry = z.infer<typeof CouncilSynthesisEntrySchema>;

export const CouncilRunSchema = z.object({
  id: z.string(),
  councilId: z.string(),
  prompt: z.string(),
  /** The format this run was (last) synthesized in — the active entry. */
  format: CouncilFormatSchema,
  status: CouncilRunStatusSchema,
  /** Snapshot of the council's synthesizer when the run (last) synthesized. */
  synthProvider: AgentCliSchema.optional(),
  /** Attach id for the synthesizer CLI's terminal while status is 'synthesizing'. */
  synthTerminalId: z.string().optional(),
  /** Markdown synthesis for the active `format` (also the latest entry in `syntheses`). */
  synthesis: z.string().optional(),
  /** All completed syntheses, one per format (the active `synthesis` is a slice of). */
  syntheses: z.array(CouncilSynthesisEntrySchema).default([]),
  error: z.string().optional(),
  members: z.array(CouncilRunMemberSchema),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
});
export type CouncilRun = z.infer<typeof CouncilRunSchema>;

// --- Requests ---

export const CreateCouncilRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).optional(),
  synthProvider: AgentCliSchema.optional(),
  defaultFormat: CouncilFormatSchema.optional(),
  customPrompt: z.string().max(20000).optional(),
});
export type CreateCouncilRequest = z.infer<typeof CreateCouncilRequestSchema>;

export const UpdateCouncilRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  synthProvider: AgentCliSchema.optional(),
  defaultFormat: CouncilFormatSchema.optional(),
  customPrompt: z.string().max(20000).optional(),
  archived: z.boolean().optional(),
});
export type UpdateCouncilRequest = z.infer<typeof UpdateCouncilRequestSchema>;

// All fields optional so a blank member can be added and filled in later
// (mirrors CreateSubAgentRequestSchema); the service coalesces to defaults.
export const CreateCouncilMemberRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  provider: AgentCliSchema.optional(),
  role: z.string().max(10000).optional(),
});
export type CreateCouncilMemberRequest = z.infer<typeof CreateCouncilMemberRequestSchema>;

export const UpdateCouncilMemberRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  provider: AgentCliSchema.optional(),
  role: z.string().max(10000).optional(),
});
export type UpdateCouncilMemberRequest = z.infer<typeof UpdateCouncilMemberRequestSchema>;

/** New ordering for a council's members — every member id, once. */
export const ReorderCouncilMembersRequestSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1),
});
export type ReorderCouncilMembersRequest = z.infer<typeof ReorderCouncilMembersRequestSchema>;

export const StartCouncilRunRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(20000),
  /** Synthesis format for this run; defaults to the council's defaultFormat. */
  format: CouncilFormatSchema.optional(),
});
export type StartCouncilRunRequest = z.infer<typeof StartCouncilRunRequestSchema>;

/** Re-synthesize a finished run's captured responses, optionally switching the format. */
export const RetryCouncilSynthesisRequestSchema = z.object({
  format: CouncilFormatSchema.optional(),
});
export type RetryCouncilSynthesisRequest = z.infer<typeof RetryCouncilSynthesisRequestSchema>;

// --- Response envelopes (mirror ProjectResponse) ---

export const CouncilResponseSchema = z.object({ council: CouncilSchema });
export const CouncilMemberResponseSchema = z.object({ member: CouncilMemberSchema });
export const CouncilRunResponseSchema = z.object({ run: CouncilRunSchema });
export const CouncilRunsResponseSchema = z.object({ runs: z.array(CouncilRunSchema) });

export type CouncilResponse = z.infer<typeof CouncilResponseSchema>;
export type CouncilMemberResponse = z.infer<typeof CouncilMemberResponseSchema>;
export type CouncilRunResponse = z.infer<typeof CouncilRunResponseSchema>;
export type CouncilRunsResponse = z.infer<typeof CouncilRunsResponseSchema>;
