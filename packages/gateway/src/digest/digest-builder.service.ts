import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  Digest,
  DigestCycle,
  DigestHeadline,
  DigestSpend,
  DigestWindow,
  TaskRetro,
  TaskSummary,
} from '@midnite/shared';

import { LlmService } from '../agent/llm/llm.service';
import { RETRO_PORT, type RetroPort } from '../retro/retro-port';
import { DigestRepository } from './digest.repository';
import { assembleDigest, computeDigestCore, type DigestCore } from './lib/build-digest';

const HEADLINE_SCHEMA = {
  type: 'object' as const,
  properties: {
    headline: {
      type: 'string',
      maxLength: 400,
      description: 'One short paragraph (1–3 sentences) summarising what the fleet did in the window.',
    },
  },
  required: ['headline'],
};

const HEADLINE_SYSTEM =
  'You are a concise engineering lead writing a daily fleet digest headline. Summarise the outcome in 1–3 plain sentences. No lists, no markdown, no preamble — just the paragraph.';

export interface BuildDigestInput {
  window: DigestWindow;
  groupBy: 'repo' | 'project';
  tasks: TaskSummary[];
  /** Best-effort P61 stats; null when unavailable. */
  spend?: DigestSpend | null;
  cycle?: DigestCycle | null;
  signal?: AbortSignal;
}

/**
 * Phase 62 C — assembles + stores a fleet digest. Deterministic aggregation lives
 * in {@link computeDigestCore}; this service gathers each task's retro (for
 * highlights), adds **one** fail-soft LLM headline, renders markdown, and persists
 * the row. LLM off / capped / error ⇒ the digest still lands with `headline: null`.
 */
@Injectable()
export class DigestBuilderService {
  private readonly logger = new Logger(DigestBuilderService.name);

  constructor(
    @Inject(RETRO_PORT) private readonly retro: RetroPort,
    @Inject(LlmService) private readonly llm: LlmService,
    @Inject(DigestRepository) private readonly repo: DigestRepository,
  ) {}

  async build(input: BuildDigestInput): Promise<Digest> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const retros = new Map<string, TaskRetro>();
    for (const t of input.tasks) {
      const r = this.retro.get(t.id);
      if (r) retros.set(t.id, r);
    }

    const core = computeDigestCore(input.tasks, retros, input.groupBy);
    const spend = input.spend ?? null;
    const cycle = input.cycle ?? null;
    const headline = await this.generateHeadline(core, input.window, input.signal);

    const digest = assembleDigest({ id, createdAt, window: input.window, groupBy: input.groupBy, core, spend, cycle, headline });

    this.repo.insert({
      id,
      windowFrom: input.window.from,
      windowTo: input.window.to,
      taskCount: input.tasks.length,
      hasHeadline: headline ? 1 : 0,
      digest: JSON.stringify(digest),
      createdAt,
    });

    return digest;
  }

  /** One small structured call; null on LLM-off / cap / error (fail-soft). */
  private async generateHeadline(
    core: DigestCore,
    window: DigestWindow,
    signal?: AbortSignal,
  ): Promise<DigestHeadline | null> {
    if (!this.llm.enabled) return null;
    try {
      const sectionSummary = core.sections
        .slice(0, 6)
        .map((s) => `${s.label}: ${s.counts.shipped} shipped/${s.counts.failed} failed`)
        .join('; ');
      const highlightSummary = core.highlights
        .slice(0, 6)
        .map((h) => `${h.outcome === 'abandoned' ? '⚠' : '✓'} ${h.title}${h.note ? ` (${h.note})` : ''}`)
        .join('; ');
      const prompt = [
        `Window: ${window.from} → ${window.to}`,
        `Totals: ${core.counts.shipped} shipped, ${core.counts.failed} failed, ${core.counts.needsAttention} need attention, ${core.counts.total} total.`,
        sectionSummary ? `Sections: ${sectionSummary}.` : '',
        highlightSummary ? `Notable: ${highlightSummary}.` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const { data } = await this.llm.generateStructured(
        {
          model: this.llm.getActModel(),
          maxTokens: 256,
          system: HEADLINE_SYSTEM,
          schema: HEADLINE_SCHEMA,
          schemaName: 'digest_headline',
          schemaDescription: 'Record the one-paragraph digest headline.',
          messages: [{ role: 'user', text: prompt }],
          ...(signal ? { signal } : {}),
        },
        'digest',
      );

      const headline = (data as { headline?: unknown }).headline;
      if (typeof headline !== 'string' || !headline.trim()) return null;
      return { headline: headline.trim(), generatedBy: 'llm' };
    } catch (err) {
      this.logger.warn(`digest headline generation failed (${err instanceof Error ? err.message : 'unknown'}); deterministic-only`);
      return null;
    }
  }
}
