import { Global, Module } from '@nestjs/common';
import { TaskEventBus } from './task-event-bus';

/**
 * Provides the single `TaskEventBus` instance app-wide. `@Global` so subscribers
 * inject it without importing `TasksModule` — notably the workflow `task-event`
 * trigger, which lives in `WorkflowsModule` and can't import `TasksModule` (that
 * would close the `Tasks → Workflows` module cycle). Same rationale as
 * `TaskCreatorModule` for the `task.create` executor.
 */
@Global()
@Module({
  providers: [TaskEventBus],
  exports: [TaskEventBus],
})
export class TaskEventBusModule {}
