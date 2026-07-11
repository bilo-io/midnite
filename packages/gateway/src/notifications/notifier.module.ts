import { Global, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { NotificationsService } from './notifications.service';
import { NOTIFIER, type Notifier } from './notifier';

/**
 * Binds the `NOTIFIER` port to `NotificationsService.notifyDirect` app-wide.
 * `@Global` so the `midnite.notify` executor injects the token without importing
 * `NotificationsModule`. Resolves the service lazily via `ModuleRef`.
 */
@Global()
@Module({
  providers: [
    {
      provide: NOTIFIER,
      useFactory: (moduleRef: ModuleRef): Notifier => ({
        notify: (input) => moduleRef.get(NotificationsService, { strict: false }).notifyDirect(input),
      }),
      inject: [ModuleRef],
    },
  ],
  exports: [NOTIFIER],
})
export class NotifierModule {}
