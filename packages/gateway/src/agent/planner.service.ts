import { Inject, Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm/llm.service';

// Where a freshly-submitted item should land. The plan model triages freeform
// input: actionable now → todo (the pool picks it up); too vague / needs
// breaking down first → backlog.

const TRIAGE_SCHEMA = {
  type: 'object' as const,
  properties: {
    ready: {
      type: 'boolean',
      description:
        'true if the task is concrete and actionable now (→ todo); false if it is vague, ' +
        'a rough idea, or needs breaking down first (→ backlog).',
    },
  },
  required: ['ready'],
};

const TASK_PLAN_SYSTEM_PROMPT =
  'You are midnite\'s planner. Decide whether a submitted item is ready for an ' +
  'autonomous coding agent to start on immediately. Ready means it states a ' +
  'concrete, self-contained change or question. Not ready means it is a vague ' +
  'idea, a large epic needing decomposition, or missing essential detail. Call ' +
  'the triage tool with your decision.';

const TASK_ANSWER_SYSTEM_PROMPT =
  "You are midnite's assistant. The user submitted a question rather than a unit " +
  'of work. Answer it directly and concisely in plain Markdown — no preamble. If ' +
  'you genuinely cannot answer it without more context (e.g. it needs the actual ' +
  'codebase), say so briefly in one sentence instead of guessing.';

/** Cap on a generated inline answer — long enough to be useful, bounded for cost. */
const ANSWER_MAX_TOKENS = 800;

/**
 * Plan-model triage at task creation. Uses the (heavier) plan model to decide a
 * task's landing column. Fail-soft: when AI is disabled or the call errors it
 * defaults to ready (todo), so task creation never breaks on the planner.
 */
@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(@Inject(LlmService) private readonly llm: LlmService) {}

  async triage(prompt: string): Promise<{ ready: boolean }> {
    if (!this.llm.enabled) return { ready: true };
    try {
      const { data } = await this.llm.generateStructured(
        {
          model: this.llm.getPlanModel(),
          maxTokens: 128,
          system: TASK_PLAN_SYSTEM_PROMPT,
          schema: TRIAGE_SCHEMA,
          schemaName: 'triage',
          schemaDescription: 'Record whether the task is ready to be worked on now.',
          messages: [{ role: 'user', text: prompt }],
        },
        'planner',
      );
      const ready =
        typeof data === 'object' && data !== null && 'ready' in data
          ? (data as { ready: unknown }).ready
          : undefined;
      // Default to ready unless the model explicitly said false.
      return { ready: ready === false ? false : true };
    } catch (err) {
      this.logger.warn(
        `planner triage failed (${err instanceof Error ? err.message : 'unknown'}); defaulting to ready`,
      );
      return { ready: true };
    }
  }

  /**
   * Generate a direct answer to a question-kind task on the plan model, so a
   * "how do I…?" item is resolved inline instead of queued for an agent. Returns
   * the answer text, or null when AI is disabled, the call fails, or the model
   * returns nothing — callers treat null as "couldn't answer, fall back to the
   * normal queue" (fail-soft, like {@link triage}).
   */
  async answer(prompt: string): Promise<string | null> {
    if (!this.llm.enabled) return null;
    try {
      const { text } = await this.llm.generateText(
        {
          model: this.llm.getPlanModel(),
          maxTokens: ANSWER_MAX_TOKENS,
          system: TASK_ANSWER_SYSTEM_PROMPT,
          messages: [{ role: 'user', text: prompt }],
        },
        'planner',
      );
      const trimmed = text.trim();
      return trimmed.length > 0 ? trimmed : null;
    } catch (err) {
      this.logger.warn(
        `planner answer failed (${err instanceof Error ? err.message : 'unknown'}); leaving the question queued`,
      );
      return null;
    }
  }
}
