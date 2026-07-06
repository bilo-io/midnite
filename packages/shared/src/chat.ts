import { z } from 'zod';
import { StatusSchema, TaskKindSchema } from './task.js';

/**
 * Phase 59 — Chat to Board. The **intent contract**: a typed representation of
 * what a natural-language command wants to do to the board. It's the shared
 * output of *both* the deterministic grammar parser and the LLM fallback
 * (Decision §4 — one contract, source-agnostic), so the executor (Theme B) never
 * cares where an intent came from.
 *
 * Theme A defines the contract + the parse envelope + the result shape; the
 * executor, routing policy, UI and safety layers are Themes B–F.
 */

/** Scheduling priority band, mirrors `task.priority` (0 Low · 1 Normal · 2 High · 3 Urgent). */
export const ChatPrioritySchema = z.number().int().min(0).max(3);

/**
 * How a command refers to a task: either a real task id or a free-text selector
 * (a quoted/partial title). The executor (Theme B) resolves it against the board;
 * the parse layer stays ignorant of ids.
 */
export const TaskRefSchema = z.string().min(1);
export type TaskRef = z.infer<typeof TaskRefSchema>;

export const CHAT_INTENT_TYPES = [
  'createTask',
  'bulkCreate',
  'breakdown',
  'setPriority',
  'setStatus',
  'assign',
  'addDependency',
  'query',
  'unknown',
] as const;
export const ChatIntentTypeSchema = z.enum(CHAT_INTENT_TYPES);
export type ChatIntentType = z.infer<typeof ChatIntentTypeSchema>;

/** Create a single task — routes to `createFromPrompt` (classify + triage + repo-guess). */
export const CreateTaskIntentSchema = z.object({
  type: z.literal('createTask'),
  title: z.string().min(1),
  priority: ChatPrioritySchema.optional(),
  repo: z.string().optional(),
  project: z.string().optional(),
  kind: TaskKindSchema.optional(),
});

/** Create several tasks at once — routes to `createBulk`. */
export const BulkCreateIntentSchema = z.object({
  type: z.literal('bulkCreate'),
  titles: z.array(z.string().min(1)).min(1),
  priority: ChatPrioritySchema.optional(),
  repo: z.string().optional(),
  project: z.string().optional(),
});

/** Decompose a goal into dependency-wired tasks — routes to `BreakdownService`. */
export const BreakdownIntentSchema = z.object({
  type: z.literal('breakdown'),
  goal: z.string().min(1),
  repo: z.string().optional(),
  project: z.string().optional(),
});

/** Set a task's scheduling priority. */
export const SetPriorityIntentSchema = z.object({
  type: z.literal('setPriority'),
  task: TaskRefSchema,
  priority: ChatPrioritySchema,
});

/** Move a task to a status column. */
export const SetStatusIntentSchema = z.object({
  type: z.literal('setStatus'),
  task: TaskRefSchema,
  status: StatusSchema,
});

/**
 * Assign a task's repo / project / milestone — at least one target (enforced by
 * a `superRefine` on the union below; a discriminated-union member must be a bare
 * object, so the "≥1 target" rule can't live in a `.refine()` here).
 */
export const AssignIntentSchema = z.object({
  type: z.literal('assign'),
  task: TaskRefSchema,
  repo: z.string().optional(),
  project: z.string().optional(),
  milestone: z.string().optional(),
});

/** Add a blocker edge (`task` depends on `dependsOn`) — inherits the cycle-check. */
export const AddDependencyIntentSchema = z.object({
  type: z.literal('addDependency'),
  task: TaskRefSchema,
  dependsOn: TaskRefSchema,
});

/** A deterministic read the query answerer can run without inference (Theme C). */
export const QueryReadSchema = z.object({
  /** `list` returns matching tasks; `count` returns just the number. */
  metric: z.enum(['list', 'count']),
  /** Restrict to a status column. */
  status: StatusSchema.optional(),
  /** Only blocked tasks (unmet blockers). */
  blocked: z.boolean().optional(),
  /** Only ready tasks (todo whose blockers are all done). */
  ready: z.boolean().optional(),
});
export type QueryRead = z.infer<typeof QueryReadSchema>;

/**
 * Ask the board a question (read-only). `read` is present when the grammar
 * recognised a deterministic filter ("show blocked", "todo count"); absent means
 * it's a free-form question for the LLM summary path (Theme C).
 */
export const QueryIntentSchema = z.object({
  type: z.literal('query'),
  text: z.string().min(1),
  read: QueryReadSchema.optional(),
});

/**
 * The input couldn't be mapped to a concrete intent. Carries the raw text + a
 * reason so the UI can ask the user to clarify rather than guessing (Theme F).
 */
export const UnknownIntentSchema = z.object({
  type: z.literal('unknown'),
  text: z.string(),
  reason: z.string().optional(),
});

export const ChatIntentSchema = z
  .discriminatedUnion('type', [
    CreateTaskIntentSchema,
    BulkCreateIntentSchema,
    BreakdownIntentSchema,
    SetPriorityIntentSchema,
    SetStatusIntentSchema,
    AssignIntentSchema,
    AddDependencyIntentSchema,
    QueryIntentSchema,
    UnknownIntentSchema,
  ])
  .superRefine((intent, ctx) => {
    if (
      intent.type === 'assign' &&
      intent.repo == null &&
      intent.project == null &&
      intent.milestone == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'assign needs at least one of repo / project / milestone',
      });
    }
  });
export type ChatIntent = z.infer<typeof ChatIntentSchema>;

/** Where a parsed intent came from — surfaced for cost transparency (Theme D). */
export const CHAT_INTENT_SOURCES = ['grammar', 'llm'] as const;
export const ChatIntentSourceSchema = z.enum(CHAT_INTENT_SOURCES);
export type ChatIntentSource = z.infer<typeof ChatIntentSourceSchema>;

/**
 * The parse result: the intent plus how it was produced. `source: 'grammar'`
 * means zero inference (confidence 1). `confidence` is 0–1; a low-confidence
 * parse should be confirmed / clarified rather than executed silently (Theme F).
 */
export const ChatIntentParseSchema = z.object({
  intent: ChatIntentSchema,
  source: ChatIntentSourceSchema,
  confidence: z.number().min(0).max(1),
});
export type ChatIntentParse = z.infer<typeof ChatIntentParseSchema>;

/**
 * How the command was ultimately resolved, for the "what did this cost" line
 * (Theme D): `deterministic` = parsed by the grammar, no AI; `local` = a local
 * `openai-compatible` model (zero API cost); `provider` = the active paid provider.
 */
export const CHAT_INFERENCE_PATHS = ['deterministic', 'local', 'provider'] as const;
export const ChatInferencePathSchema = z.enum(CHAT_INFERENCE_PATHS);
export type ChatInferencePath = z.infer<typeof ChatInferencePathSchema>;

/** Human copy for the inference-path chip. */
export const CHAT_INFERENCE_PATH_LABEL: Record<ChatInferencePath, string> = {
  deterministic: 'parsed locally — no AI used',
  local: 'via local model',
  provider: 'via provider',
};

/**
 * The outcome of executing a command (produced by Theme B). Defined now so the
 * executor, undo (Theme F) and cost-transparency (Theme D) layers share a stable
 * contract; Theme A produces {@link ChatIntentParse}, not results.
 */
export const ChatCommandResultSchema = z.object({
  /** Human-readable summary of what happened ("Created 3 tasks on `api`"). */
  summary: z.string(),
  /** Ids of the tasks created or changed. */
  affectedIds: z.array(z.string()),
  /** Opaque token to revert this command (Theme F). Absent for read-only queries. */
  undoToken: z.string().optional(),
  /** How the intent was resolved, for the cost line. */
  inferencePath: ChatInferencePathSchema,
});
export type ChatCommandResult = z.infer<typeof ChatCommandResultSchema>;
