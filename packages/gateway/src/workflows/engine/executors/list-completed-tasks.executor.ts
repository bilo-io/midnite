import { Inject, Injectable } from '@nestjs/common';
import { ListCompletedTasksParamsSchema } from '@midnite/shared';
import { TASK_LISTER, type TaskLister } from '../../../tasks/task-lister';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

/**
 * midnite.list-completed-tasks — the terminal (done/abandoned) tasks whose last
 * transition falls in a trailing window (Phase 62 C), optionally scoped to a
 * repo/project. Reads through the `TASK_LISTER` port (no `TasksModule` import),
 * returning the lean P57 `TaskSummary` DTO. The output feeds `midnite.build-digest`.
 */
@Injectable()
export class ListCompletedTasksExecutor implements NodeExecutor {
  readonly typeId = 'midnite.list-completed-tasks';

  constructor(@Inject(TASK_LISTER) private readonly tasks: TaskLister) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = ListCompletedTasksParamsSchema.parse(ctx.params);
    const to = new Date();
    const from = new Date(to.getTime() - params.sinceHours * 3_600_000);
    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    const items = this.tasks.listTerminal({
      from: fromIso,
      to: toIso,
      repo: params.repo,
      projectId: params.projectId,
    });
    ctx.log('info', `found ${items.length} completed task(s) in the last ${params.sinceHours}h`);

    return { from: fromIso, to: toIso, count: items.length, tasks: items };
  }
}
