import { z } from 'zod';

/**
 * Phase 66 E — the **Assistant answer contract**. The agent answers a free-form
 * question about the fleet/tasks/sessions as an ordered list of **blocks**:
 * either prose (`markdown`) or an inline **midnite component** chosen from a
 * *fixed, id-referencing registry* (Decision §4). The LLM emits only a component
 * `name` + a small `props` **reference** (e.g. a `taskId`) — never fabricated
 * data — and the web dispatcher resolves the real, server-authoritative data
 * client-side (Decision: id-reference). An unknown/invalid block degrades to
 * markdown rather than crashing the transcript.
 *
 * Read-only: this contract describes an *answer*, never a mutation. The agent
 * cannot change the board (that stays chat-to-board's job, Phase 59).
 */

/** The fixed set of components the agent may render inline. Grows additively. */
export const ASSISTANT_COMPONENT_NAMES = ['task-card', 'fleet-gauge', 'session-list', 'sparkline'] as const;
export const AssistantComponentNameSchema = z.enum(ASSISTANT_COMPONENT_NAMES);
export type AssistantComponentName = z.infer<typeof AssistantComponentNameSchema>;

/** Metric series a `sparkline` can plot (resolved client-side from the metrics API). */
export const ASSISTANT_SPARKLINE_METRICS = ['cycle-time', 'throughput', 'queue-depth', 'cost'] as const;
export const AssistantSparklineMetricSchema = z.enum(ASSISTANT_SPARKLINE_METRICS);
export type AssistantSparklineMetric = z.infer<typeof AssistantSparklineMetricSchema>;

/** Prose block — rendered via the shared `MarkdownPreview`. */
export const AssistantMarkdownBlockSchema = z.object({
  kind: z.literal('markdown'),
  text: z.string().min(1),
});
export type AssistantMarkdownBlock = z.infer<typeof AssistantMarkdownBlockSchema>;

/** `task-card` — references one task by id; web resolves it to a `TaskSummary`. */
export const AssistantTaskCardBlockSchema = z.object({
  kind: z.literal('component'),
  name: z.literal('task-card'),
  props: z.object({ taskId: z.string().min(1) }),
});

/** `fleet-gauge` — live status counts; no props (the client reads current counts). */
export const AssistantFleetGaugeBlockSchema = z.object({
  kind: z.literal('component'),
  name: z.literal('fleet-gauge'),
  props: z.object({}).strict().default({}),
});

/** `session-list` — the active sessions, optionally capped. */
export const AssistantSessionListBlockSchema = z.object({
  kind: z.literal('component'),
  name: z.literal('session-list'),
  props: z.object({ limit: z.number().int().positive().max(20).optional() }).default({}),
});

/** `sparkline` — a small trend of one metric series. */
export const AssistantSparklineBlockSchema = z.object({
  kind: z.literal('component'),
  name: z.literal('sparkline'),
  props: z.object({ metric: AssistantSparklineMetricSchema }),
});

/** A component block — discriminated on `name` so each carries its typed props. */
export const AssistantComponentBlockSchema = z.discriminatedUnion('name', [
  AssistantTaskCardBlockSchema,
  AssistantFleetGaugeBlockSchema,
  AssistantSessionListBlockSchema,
  AssistantSparklineBlockSchema,
]);
export type AssistantComponentBlock = z.infer<typeof AssistantComponentBlockSchema>;

/** One block of an assistant answer: prose or an inline component. */
export const AssistantBlockSchema = z.union([AssistantMarkdownBlockSchema, AssistantComponentBlockSchema]);
export type AssistantBlock = z.infer<typeof AssistantBlockSchema>;

/**
 * Coerce one loosely-shaped block (as an LLM structured-output item might arrive)
 * into a valid {@link AssistantBlock}. A block that fails validation — an unknown
 * component name, a missing ref, malformed props — is **downgraded to markdown**
 * (using its `text`/`name` if any) rather than dropped, so the answer always
 * renders. Returns `null` only when there's nothing salvageable.
 */
export function coerceAssistantBlock(raw: unknown): AssistantBlock | null {
  const direct = AssistantBlockSchema.safeParse(raw);
  if (direct.success) return direct.data;
  if (raw && typeof raw === 'object') {
    const obj = raw as { text?: unknown; name?: unknown };
    if (typeof obj.text === 'string' && obj.text.trim()) {
      return { kind: 'markdown', text: obj.text.trim() };
    }
    if (typeof obj.name === 'string') {
      // A component we couldn't validate — name it in prose so the user still sees intent.
      return { kind: 'markdown', text: `_(could not render \`${obj.name}\`)_` };
    }
  }
  return null;
}

/** How the answer was produced (mirrors chat-query's `inferencePath`). */
export const AssistantInferencePathSchema = z.enum(['deterministic', 'provider']);
export type AssistantInferencePath = z.infer<typeof AssistantInferencePathSchema>;

/** `POST /assistant/query` request — one free-form question. */
export const AssistantQueryRequestSchema = z.object({
  question: z.string().min(1).max(2_000),
});
export type AssistantQueryRequest = z.infer<typeof AssistantQueryRequestSchema>;

/** `POST /assistant/query` response — the ordered blocks + the path used. */
export const AssistantQueryResponseSchema = z.object({
  blocks: z.array(AssistantBlockSchema),
  inferencePath: AssistantInferencePathSchema,
});
export type AssistantQueryResponse = z.infer<typeof AssistantQueryResponseSchema>;
