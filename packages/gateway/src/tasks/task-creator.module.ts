import { Global, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { TasksService } from './tasks.service';
import { TASK_CREATOR, type TaskCreator } from './task-creator';

/**
 * Binds the `TASK_CREATOR` port to `TasksService` for the whole app. `@Global` so
 * consumers (the workflow `task.create` executor) inject the token without importing
 * `TasksModule` — avoiding the `Tasks ↔ Workflows` module cycle. `TasksService` is
 * resolved lazily via `ModuleRef` at call time, so this provider adds no
 * construction-time dependency on the (later-initialised) `TasksModule`.
 */
@Global()
@Module({
  providers: [
    {
      provide: TASK_CREATOR,
      useFactory: (moduleRef: ModuleRef): TaskCreator => ({
        createTask: (input) =>
          moduleRef
            .get(TasksService, { strict: false })
            .createFromPrompt(
              {
                prompt: input.prompt,
                repo: input.repo,
                projectId: input.projectId,
                priority: input.priority,
                createdBy: input.createdBy ?? undefined,
                images: [],
              },
              { emit: true },
            ),
      }),
      inject: [ModuleRef],
    },
  ],
  exports: [TASK_CREATOR],
})
export class TaskCreatorModule {}
