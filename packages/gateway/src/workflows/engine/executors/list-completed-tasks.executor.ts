import { Inject, Injectable } from '@nestjs/common';
import { ListCompletedTasksParamsSchema } from '@midnite/shared';

import { TASK_READER, type TaskReader } from '../../../tasks/task-reader';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

/**
 * midnite.list-completed-tasks — the terminal (done/abandoned) tasks that finished
 * in a window, as lean P57 summaries (no full hydration). `sinceHours` (default 24)
 * defines a trailing window ending now; explicit `from`/`to` override it when both
 * are set. Emits `{ tasks, count, window }` for a downstream `build-digest`.
 */
@Injectable()
export class ListCompletedTasksExecutor implements NodeExecutor {
  readonly typeId = 'midnite.list-completed-tasks';

  constructor(@Inject(TASK_READER) private readonly tasks: TaskReader) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = ListCompletedTasksParamsSchema.parse(ctx.params);

    const to = params.to ?? new Date().toISOString();
    const from =
      params.from ?? new Date(Date.parse(to) - params.sinceHours * 3600_000).toISOString();

    const tasks = this.tasks.listCompleted({
      from,
      to,
      repo: params.repo,
      projectId: params.projectId,
    });

    ctx.log('info', `found ${tasks.length} completed task(s) in ${from} → ${to}`);
    return { tasks, count: tasks.length, window: { from, to } };
  }
}
