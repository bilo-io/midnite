import { Inject, Injectable } from '@nestjs/common';
import {
  GenerateRetroParamsSchema,
  RetroNarrativeDraftSchema,
  RetroNarrativeSchema,
  isRetroNotable,
  type RetroNarrative,
} from '@midnite/shared';
import { LlmService } from '../../../agent/llm/llm.service';
import { RETRO_ACCESSOR, type RetroAccessor } from '../../../retro/retro-accessor';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

const NARRATIVE_SCHEMA = {
  type: 'object',
  properties: {
    whatHappened: { type: 'string' },
    whatTrippedIt: { type: ['string', 'null'] },
    notable: { type: 'array', items: { type: 'string' } },
  },
  required: ['whatHappened', 'notable'],
  additionalProperties: false,
} as const;

/** Pull a task id from the upstream input when the param is blank. */
function taskIdFromInput(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const o = input as Record<string, unknown>;
  for (const key of ['taskId', 'id', 'linkedTaskId']) {
    if (typeof o[key] === 'string') return o[key] as string;
  }
  return undefined;
}

/**
 * midnite.generate-retro — attach an LLM narrative to a completed task's retro
 * skeleton (Phase 62 C). Fetches (or builds) the deterministic skeleton + a bounded
 * transcript excerpt via the `RETRO_ACCESSOR` port (no `RetroModule` import), makes
 * ONE plan-model `generateStructured` call (usage tag `'retro'`), and persists the
 * narrative. Fail-soft: LLM off / error / no transcript / no terminal retro → the
 * skeleton stays, narrative null, the node still succeeds.
 *
 * Output always carries `outcome` (`'done'`/`'abandoned'`/`null`) and a deterministic
 * `notable` boolean (`isRetroNotable`), so the retro pipeline (Phase 62 D) can branch
 * its notify step on `notable` regardless of whether the LLM narrative was produced.
 */
@Injectable()
export class GenerateRetroExecutor implements NodeExecutor {
  readonly typeId = 'midnite.generate-retro';

  constructor(
    @Inject(RETRO_ACCESSOR) private readonly retro: RetroAccessor,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = GenerateRetroParamsSchema.parse(ctx.params);
    const taskId = params.taskId?.trim() || taskIdFromInput(ctx.input);
    if (!taskId) {
      throw new Error('generate-retro: no taskId in params or upstream input');
    }

    const loaded = await this.retro.loadForNarrative(taskId);
    if (!loaded) {
      ctx.log('warn', `no terminal retro for task ${taskId} — skipping narrative`);
      return { taskId, narrative: null, generated: false, outcome: null, notable: false };
    }

    if (!this.llm.enabled) {
      ctx.log('info', 'AI unavailable — retro left as deterministic skeleton');
      return {
        taskId,
        retro: loaded.retro,
        narrative: null,
        generated: false,
        outcome: loaded.retro.outcome,
        notable: isRetroNotable(loaded.retro),
      };
    }

    try {
      const skeleton = {
        outcome: loaded.retro.outcome,
        durations: loaded.retro.durations,
        attempts: loaded.retro.attempts.length,
        failures: loaded.retro.failures.map((f) => ({ class: f.class, detail: f.detail })),
        checks: loaded.retro.checks ?? null,
      };
      const res = await this.llm.generateStructured(
        {
          model: this.llm.getPlanModel(),
          maxTokens: 700,
          system:
            'You summarise a software task retrospective for an engineering team. Be concise and factual. `whatHappened`: 1-3 sentences. `whatTrippedIt`: the main blocker, or null. `notable`: 0-4 short bullet strings a human should note.',
          messages: [
            {
              role: 'user',
              text: `Retro skeleton:\n${JSON.stringify(skeleton, null, 2)}\n\nTranscript excerpt:\n${loaded.transcriptExcerpt || '(none)'}`,
            },
          ],
          schema: NARRATIVE_SCHEMA,
          schemaName: 'retro_narrative',
          signal: ctx.signal,
        },
        'retro',
      );
      const parsed = RetroNarrativeDraftSchema.parse(res.data);
      const narrative: RetroNarrative = RetroNarrativeSchema.parse({
        whatHappened: parsed.whatHappened,
        whatTrippedIt: parsed.whatTrippedIt ?? null,
        notable: parsed.notable,
        generatedBy: 'llm',
      });
      this.retro.storeNarrative(taskId, narrative);
      ctx.log('info', `retro narrative generated for task ${taskId}`);
      return {
        taskId,
        narrative,
        generated: true,
        outcome: loaded.retro.outcome,
        notable: isRetroNotable(loaded.retro),
      };
    } catch (err) {
      ctx.log('warn', `retro narrative failed (${err instanceof Error ? err.message : 'unknown'}) — skeleton kept`);
      return {
        taskId,
        retro: loaded.retro,
        narrative: null,
        generated: false,
        outcome: loaded.retro.outcome,
        notable: isRetroNotable(loaded.retro),
      };
    }
  }
}
