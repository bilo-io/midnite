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
      const { data } = await this.llm.generateStructured({
        model: this.llm.getPlanModel(),
        maxTokens: 128,
        system: TASK_PLAN_SYSTEM_PROMPT,
        schema: TRIAGE_SCHEMA,
        schemaName: 'triage',
        schemaDescription: 'Record whether the task is ready to be worked on now.',
        messages: [{ role: 'user', text: prompt }],
      });
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
}
