import { Global, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { TasksService } from './tasks.service';
import { TASK_LISTER, type TaskLister } from './task-lister';

/**
 * Binds the `TASK_LISTER` port to `TasksService` for the whole app (Phase 62 C).
 * `@Global` so the workflow `midnite.list-completed-tasks` executor injects the
 * token without importing `TasksModule` — avoiding the `Tasks ↔ Workflows` module
 * cycle. `TasksService` is resolved lazily via `ModuleRef` at call time, so this
 * provider adds no construction-time dependency on the (later-initialised) module.
 */
@Global()
@Module({
  providers: [
    {
      provide: TASK_LISTER,
      useFactory: (moduleRef: ModuleRef): TaskLister => ({
        listTerminal: (query) =>
          moduleRef.get(TasksService, { strict: false }).listTerminalSummaries(query),
      }),
      inject: [ModuleRef],
    },
  ],
  exports: [TASK_LISTER],
})
export class TaskListerModule {}
