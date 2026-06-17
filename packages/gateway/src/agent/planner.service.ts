import { Inject, Injectable, Logger } from '@nestjs/common';
import type Anthropic from '@anthropic-ai/sdk';
import { AnthropicService } from './anthropic.service';

// Where a freshly-submitted item should land. The plan model triages freeform
// input: actionable now → todo (the pool picks it up); too vague / needs
// breaking down first → backlog.

const TRIAGE_TOOL = {
  name: 'triage',
  description: 'Record whether the task is ready to be worked on now.',
  input_schema: {
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
  },
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

  constructor(@Inject(AnthropicService) private readonly anthropic: AnthropicService) {}

  async triage(prompt: string): Promise<{ ready: boolean }> {
    if (!this.anthropic.enabled) return { ready: true };
    try {
      const client = this.anthropic.getClient();
      const res = await client.messages.create({
        model: this.anthropic.getPlanModel(),
        max_tokens: 128,
        system: [
          { type: 'text', text: TASK_PLAN_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        tools: [TRIAGE_TOOL],
        tool_choice: { type: 'tool', name: 'triage' },
        messages: [{ role: 'user', content: prompt }],
      });
      const toolUse = res.content.find(
        (block): block is Anthropic.Messages.ToolUseBlock =>
          block.type === 'tool_use' && block.name === 'triage',
      );
      const input = toolUse?.input;
      const ready =
        typeof input === 'object' && input !== null && 'ready' in input
          ? (input as { ready: unknown }).ready
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
