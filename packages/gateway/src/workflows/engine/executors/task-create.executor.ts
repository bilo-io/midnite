import { Inject, Injectable } from '@nestjs/common';
import { TaskCreateParamsSchema } from '@midnite/shared';
import { TASK_CREATOR, type TaskCreator } from '../../../tasks/task-creator';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

/**
 * task.create — enqueue a midnite board task. A `[trigger] → [task.create]` workflow
 * opens a board task when it runs (e.g. on a webhook or task-event, or on demand).
 * The created task inherits the workflow's owner (`ctx.workflowCreatedBy`)
 * so team scoping holds exactly like a manually-created task. Reaches the task store
 * through the `TASK_CREATOR` port (no `TasksModule` import — see `task-creator.ts`).
 */
@Injectable()
export class TaskCreateExecutor implements NodeExecutor {
  readonly typeId = 'task.create';

  constructor(@Inject(TASK_CREATOR) private readonly tasks: TaskCreator) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = TaskCreateParamsSchema.parse(ctx.params);
    ctx.log('info', `creating task: ${params.prompt.slice(0, 80)}`);

    const task = await this.tasks.createTask({
      prompt: params.prompt,
      repo: params.repo,
      projectId: params.projectId,
      priority: params.priority,
      createdBy: ctx.workflowCreatedBy,
    });

    ctx.log('info', `created task ${task.id}`);
    return task;
  }
}
