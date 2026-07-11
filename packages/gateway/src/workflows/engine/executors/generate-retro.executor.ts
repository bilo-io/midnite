import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  GenerateRetroParamsSchema,
  RetroNarrativeSchema,
  type RetroNarrative,
  type TaskRetro,
} from '@midnite/shared';

import { LlmService } from '../../../agent/llm/llm.service';
import { RETRO_PORT, type RetroPort } from '../../../retro/retro-port';
import { TASK_READER, type TaskReader } from '../../../tasks/task-reader';
import { findTranscriptBySessionId } from '../../../sessions/sessions.reader';
import { transcriptExcerpt } from '../../../sessions/lib/transcript-slice';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

const NARRATIVE_SCHEMA = {
  type: 'object' as const,
  properties: {
    whatHappened: { type: 'string', maxLength: 1200, description: 'What the agent did on this task, in 1–4 plain sentences.' },
    whatTrippedIt: { type: 'string', description: 'What blocked or slowed the task; empty string if nothing notable tripped it.' },
    notable: { type: 'array', items: { type: 'string' }, maxItems: 6, description: 'Up to 6 short notable observations.' },
  },
  required: ['whatHappened', 'notable'],
};

const NARRATIVE_SYSTEM =
  'You write terse, factual task retrospectives for an engineering fleet. Ground every statement in the provided timeline/failures/transcript — never invent detail. Be specific and short.';

/**
 * midnite.generate-retro — build a task's retrospective and layer on a one-call AI
 * narrative. The deterministic skeleton (Phase 62 A) is the source of truth; the
 * narrative is **fail-soft**: with the LLM off / capped / erroring the node
 * succeeds with the skeleton and `narrativeGenerated: false`. Reads a **bounded**
 * transcript slice (never the whole JSONL) when the session transcript resolves.
 * Services are reached through the `@Global` `RETRO_PORT` / `TASK_READER` ports to
 * avoid the retro/tasks → workflows module cycle.
 */
@Injectable()
export class GenerateRetroExecutor implements NodeExecutor {
  readonly typeId = 'midnite.generate-retro';
  private readonly logger = new Logger(GenerateRetroExecutor.name);

  constructor(
    @Inject(RETRO_PORT) private readonly retro: RetroPort,
    @Inject(TASK_READER) private readonly tasks: TaskReader,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = GenerateRetroParamsSchema.parse(ctx.params);
    const { taskId } = params;

    let retro = this.retro.get(taskId);
    if (!retro) {
      const task = this.tasks.getTask(taskId);
      if (!task) throw new Error(`generate-retro: task ${taskId} not found`);
      retro = this.retro.buildAndStore(task);
    }

    if (!this.llm.enabled) {
      ctx.log('info', 'AI unavailable — retro skeleton only (no narrative)');
      return { taskId, retro, narrativeGenerated: false };
    }

    try {
      const excerpt = await this.transcriptSlice(taskId);
      const { data } = await this.llm.generateStructured(
        {
          model: this.llm.getActModel(),
          maxTokens: 512,
          system: NARRATIVE_SYSTEM,
          schema: NARRATIVE_SCHEMA,
          schemaName: 'task_retro_narrative',
          schemaDescription: 'Record a factual retrospective narrative for the task.',
          messages: [{ role: 'user', text: this.buildPrompt(retro, excerpt) }],
          ...(ctx.signal ? { signal: ctx.signal } : {}),
        },
        'retro',
      );

      const raw = data as { whatHappened?: unknown; whatTrippedIt?: unknown; notable?: unknown };
      const narrative: RetroNarrative = {
        whatHappened: typeof raw.whatHappened === 'string' ? raw.whatHappened.trim() : '',
        whatTrippedIt:
          typeof raw.whatTrippedIt === 'string' && raw.whatTrippedIt.trim() ? raw.whatTrippedIt.trim() : null,
        notable: Array.isArray(raw.notable) ? raw.notable.filter((n): n is string => typeof n === 'string') : [],
        generatedBy: 'llm',
      };
      const validated = RetroNarrativeSchema.parse(narrative);

      const updated = this.retro.storeNarrative(taskId, validated) ?? { ...retro, narrative: validated };
      ctx.log('info', `retro narrative generated for task ${taskId}`);
      return { taskId, retro: updated, narrativeGenerated: true };
    } catch (err) {
      // Fail-soft: the skeleton already exists; a narrative failure never fails the node.
      this.logger.warn(`retro narrative failed for task ${taskId} (${err instanceof Error ? err.message : 'unknown'}); skeleton only`);
      ctx.log('warn', 'retro narrative generation failed — skeleton only');
      return { taskId, retro, narrativeGenerated: false };
    }
  }

  /** Best-effort bounded transcript excerpt; '' when no transcript resolves. */
  private async transcriptSlice(taskId: string): Promise<string> {
    const task = this.tasks.getTask(taskId);
    const sessionId = task?.sessionId;
    if (!sessionId) return '';
    const transcript = await findTranscriptBySessionId(sessionId);
    if (!transcript) return '';
    return transcriptExcerpt(transcript.messages);
  }

  private buildPrompt(retro: TaskRetro, excerpt: string): string {
    const parts: string[] = [];
    parts.push(`Outcome: ${retro.outcome}`);
    if (retro.durations.totalMs !== null) parts.push(`Total time: ${Math.round(retro.durations.totalMs / 60000)}m`);
    parts.push(`Attempts: ${retro.attempts.length}`);
    if (retro.failures.length) {
      parts.push(`Failures:\n${retro.failures.map((f) => `- ${f.class}: ${f.detail}`).join('\n')}`);
    }
    if (retro.review) parts.push(`AI review: ${retro.review.verdict} — ${retro.review.summary}`);
    if (retro.prUrl) parts.push(`PR: ${retro.prUrl}`);
    const kinds = retro.timeline.map((e) => e.kind).join(', ');
    if (kinds) parts.push(`Timeline: ${kinds}`);
    if (excerpt) parts.push(`\n--- Bounded transcript excerpt ---\n${excerpt}`);
    return parts.join('\n');
  }
}
