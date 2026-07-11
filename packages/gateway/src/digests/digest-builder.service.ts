import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DigestHeadlineDraftSchema,
  type Digest,
  type DigestCounts,
  type DigestCycle,
  type DigestSpend,
  type DigestSection,
  type TaskRetro,
} from '@midnite/shared';

import { LlmService } from '../agent/llm/llm.service';
import { MetricsService } from '../metrics/metrics.service';
import { RetroBuilderService } from '../retro/retro-builder.service';
import { TasksService } from '../tasks/tasks.service';
import { UsageService } from '../usage/usage.service';
import { DigestRepository } from './digest.repository';
import { aggregateDigest, deterministicHeadline, renderMarkdown, toBlocks } from './lib/build-digest';
import type { DigestBuildRequest, DigestBuildResult } from './digest-builder.port';

const HEADLINE_SCHEMA = {
  type: 'object',
  properties: { headline: { type: 'string' } },
  required: ['headline'],
  additionalProperties: false,
} as const;

const MS_PER_DAY = 86_400_000;

/**
 * Phase 62 Theme C — assembles + persists a fleet digest. Deterministic core (counts
 * / sections / highlights) lives in {@link aggregateDigest}; this service folds in
 * **best-effort** spend (usage attribution) + cycle-time (metrics), each degrading
 * silently to null when unreachable, and makes ONE plan-model `generateStructured`
 * call for the headline (usage tag `'digest'`, fail-soft to a deterministic one).
 * Stores the structured JSON + rendered markdown as a `digests` row.
 */
@Injectable()
export class DigestBuilderService {
  private readonly logger = new Logger(DigestBuilderService.name);

  constructor(
    @Inject(DigestRepository) private readonly repo: DigestRepository,
    @Inject(RetroBuilderService) private readonly retros: RetroBuilderService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(UsageService) private readonly usage: UsageService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  async build(req: DigestBuildRequest): Promise<DigestBuildResult> {
    const tasks =
      req.tasks ??
      this.tasks.listTerminalSummaries({
        from: req.from,
        to: req.to,
        repo: req.repo,
        projectId: req.projectId,
      });

    const retros = new Map<string, TaskRetro | undefined>(
      tasks.map((t) => [t.id, this.safeRetro(t.id)]),
    );

    const { counts, sections, highlights } = aggregateDigest(tasks, retros);
    const spend = this.bestEffortSpend(req.from, req.to, req.repo, req.projectId);
    const cycle = this.bestEffortCycle(req.from, req.to);
    const headline = await this.headline(counts, sections);

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const digest: Digest = {
      id,
      createdAt,
      from: req.from,
      to: req.to,
      counts,
      sections,
      highlights,
      spend,
      cycle,
      headline,
      markdown: '',
    };
    digest.markdown = renderMarkdown(digest);

    this.repo.insert({
      id,
      createdAt,
      windowFrom: req.from,
      windowTo: req.to,
      digest: JSON.stringify(digest),
      markdown: digest.markdown,
    });

    return { digestId: id, headline, markdown: digest.markdown, blocks: toBlocks(digest) };
  }

  private safeRetro(taskId: string): TaskRetro | undefined {
    try {
      return this.retros.getByTaskId(taskId);
    } catch {
      return undefined;
    }
  }

  /** Best-effort agent-session spend over the window. Null when unreachable. */
  private bestEffortSpend(
    from: string,
    to: string,
    repo?: string,
    projectId?: string,
  ): DigestSpend | null {
    try {
      const res = this.usage.attribution({
        from,
        to,
        groupBy: projectId && !repo ? 'project' : 'repo',
      });
      const filterKey = repo ?? projectId;
      if (filterKey) {
        const bucket = res.buckets.find((b) => b.key === filterKey);
        if (!bucket) return { totalUsd: 0, measuredUsd: 0, sessions: 0 };
        return {
          totalUsd: bucket.estCostUsd,
          measuredUsd: bucket.measuredCostUsd,
          sessions: bucket.sessions,
        };
      }
      return {
        totalUsd: res.totals.estCostUsd,
        measuredUsd: res.totals.measuredCostUsd,
        sessions: res.totals.sessions,
      };
    } catch (err) {
      this.logger.debug(`digest spend unavailable: ${String(err)}`);
      return null;
    }
  }

  /** Best-effort end-to-end cycle time over the window. Null when unreachable. */
  private bestEffortCycle(from: string, to: string): DigestCycle | null {
    try {
      const spanMs = Math.max(0, Date.parse(to) - Date.parse(from));
      const windowDays = Math.min(365, Math.max(1, Math.ceil(spanMs / MS_PER_DAY)));
      const res = this.metrics.getCycleTime({ groupBy: 'none', windowDays });
      const group = res.groups[0];
      if (!group) return null;
      return { tasks: group.taskCount, p50Ms: group.endToEnd.p50Ms, p90Ms: group.endToEnd.p90Ms };
    } catch (err) {
      this.logger.debug(`digest cycle-time unavailable: ${String(err)}`);
      return null;
    }
  }

  /** ONE plan-model headline call; fail-soft to the deterministic headline. */
  private async headline(counts: DigestCounts, sections: DigestSection[]): Promise<string> {
    const fallback = deterministicHeadline(counts);
    if (!this.llm.enabled) return fallback;
    try {
      const summary = sections
        .slice(0, 6)
        .map((s) => `${s.name}: ${s.shipped} shipped, ${s.failed} failed`)
        .join('; ');
      const res = await this.llm.generateStructured(
        {
          model: this.llm.getPlanModel(),
          maxTokens: 200,
          system:
            'You write a single punchy one-line headline (max ~12 words) summarising a software team fleet digest. No markdown, no quotes.',
          messages: [
            {
              role: 'user',
              text: `Window totals — shipped: ${counts.shipped}, failed: ${counts.failed}, need attention: ${counts.needsAttention}. By repo — ${summary || 'n/a'}.`,
            },
          ],
          schema: HEADLINE_SCHEMA,
          schemaName: 'digest_headline',
        },
        'digest',
      );
      const parsed = DigestHeadlineDraftSchema.safeParse(res.data);
      const headline = parsed.success ? parsed.data.headline.trim() : '';
      return headline || fallback;
    } catch (err) {
      this.logger.debug(`digest headline LLM failed, using deterministic: ${String(err)}`);
      return fallback;
    }
  }
}
