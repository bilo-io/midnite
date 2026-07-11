import { Inject, Injectable } from '@nestjs/common';
import { BuildDigestParamsSchema, type DigestWindow, type TaskSummary } from '@midnite/shared';

import { DigestBuilderService } from '../../../digest/digest-builder.service';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

/**
 * midnite.build-digest — aggregate the upstream `list-completed-tasks` output into
 * a stored fleet digest (deterministic sections/highlights + one fail-soft LLM
 * headline) and emit `{ digestId, markdown, headline, counts }` for delivery
 * (slack.message / midnite.notify / P44 webhooks). Thin over {@link DigestBuilderService}.
 */
@Injectable()
export class BuildDigestExecutor implements NodeExecutor {
  readonly typeId = 'midnite.build-digest';

  constructor(@Inject(DigestBuilderService) private readonly digests: DigestBuilderService) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = BuildDigestParamsSchema.parse(ctx.params);
    const input = (ctx.input ?? {}) as { tasks?: unknown; window?: unknown };

    const tasks = Array.isArray(input.tasks) ? (input.tasks as TaskSummary[]) : [];
    const window = this.resolveWindow(input.window, tasks);

    ctx.log('info', `building digest over ${tasks.length} task(s), grouped by ${params.groupBy}`);
    const digest = await this.digests.build({
      window,
      groupBy: params.groupBy,
      tasks,
      signal: ctx.signal,
    });

    return {
      digestId: digest.id,
      markdown: digest.markdown,
      headline: digest.headline?.headline ?? null,
      counts: digest.counts,
    };
  }

  private resolveWindow(raw: unknown, tasks: TaskSummary[]): DigestWindow {
    if (raw && typeof raw === 'object') {
      const w = raw as { from?: unknown; to?: unknown };
      if (typeof w.from === 'string' && typeof w.to === 'string') return { from: w.from, to: w.to };
    }
    // Fallback: derive from the tasks, else a trailing 24h window.
    const stamps = tasks.map((t) => t.updatedAt ?? t.createdAt).filter((s): s is string => !!s).sort();
    const to = stamps.at(-1) ?? new Date().toISOString();
    const from = stamps[0] ?? new Date(Date.parse(to) - 24 * 3600_000).toISOString();
    return { from, to };
  }
}
