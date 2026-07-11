import { Inject, Injectable } from '@nestjs/common';
import { BuildDigestParamsSchema, TaskSummarySchema, type TaskSummary } from '@midnite/shared';
import { DIGEST_BUILDER, type DigestBuilderPort } from '../../../digests/digest-builder.port';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

/** Extract an upstream `list-completed-tasks` task array from the input, if present
 *  and valid. Anything malformed is ignored (the builder re-queries the window). */
function tasksFromInput(input: unknown): TaskSummary[] | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = (input as Record<string, unknown>)['tasks'];
  if (!Array.isArray(raw)) return undefined;
  const parsed = TaskSummarySchema.array().safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

/**
 * midnite.build-digest — roll a window of terminal tasks up into a persisted fleet
 * digest (Phase 62 C). Uses the upstream `list-completed-tasks` output when present,
 * else the builder queries the window itself. Reaches the `DigestBuilder` through
 * the `DIGEST_BUILDER` port (no `DigestsModule` import). Returns
 * `{ digestId, headline, markdown, blocks }`.
 */
@Injectable()
export class BuildDigestExecutor implements NodeExecutor {
  readonly typeId = 'midnite.build-digest';

  constructor(@Inject(DIGEST_BUILDER) private readonly digests: DigestBuilderPort) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = BuildDigestParamsSchema.parse(ctx.params);

    const to = params.to ?? new Date().toISOString();
    const from = params.from ?? new Date(Date.parse(to) - params.sinceHours * 3_600_000).toISOString();

    const tasks = tasksFromInput(ctx.input);
    ctx.log('info', tasks ? `building digest from ${tasks.length} upstream task(s)` : `building digest for window ${from} → ${to}`);

    const result = await this.digests.build({
      from,
      to,
      repo: params.repo,
      projectId: params.projectId,
      tasks,
    });
    ctx.log('info', `digest ${result.digestId} built`);
    return result;
  }
}
