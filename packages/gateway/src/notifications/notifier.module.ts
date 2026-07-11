import { Global, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { NotificationsService } from './notifications.service';
import { NOTIFIER, type Notifier } from './notifier';

/**
 * Binds the `NOTIFIER` port to `NotificationsService` for the whole app (Phase 62
 * C). `@Global` so the workflow `midnite.notify` executor injects the token
 * without importing `NotificationsModule` — avoiding the module cycle through
 * `TasksModule → WorkflowsModule`. Resolved lazily via `ModuleRef` at call time.
 */
@Global()
@Module({
  providers: [
    {
      provide: NOTIFIER,
      useFactory: (moduleRef: ModuleRef): Notifier => ({
        notify: (input) =>
          moduleRef.get(NotificationsService, { strict: false }).notifyReporting(input),
      }),
      inject: [ModuleRef],
    },
  ],
  exports: [NOTIFIER],
})
export class NotifierModule {}
