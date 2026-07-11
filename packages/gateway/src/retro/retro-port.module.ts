import { Global, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { RetroBuilderService } from './retro-builder.service';
import { RETRO_PORT, type RetroPort } from './retro-port';

/**
 * Binds the `RETRO_PORT` port to `RetroBuilderService` app-wide. `@Global` so the
 * workflow retro/digest executors inject the token without importing `RetroModule`
 * (→ `TasksModule` → `WorkflowsModule` cycle). Resolves lazily via `ModuleRef`.
 */
@Global()
@Module({
  providers: [
    {
      provide: RETRO_PORT,
      useFactory: (moduleRef: ModuleRef): RetroPort => ({
        get: (taskId) => moduleRef.get(RetroBuilderService, { strict: false }).getByTaskId(taskId),
        buildAndStore: (task) => moduleRef.get(RetroBuilderService, { strict: false }).buildAndStore(task),
        storeNarrative: (taskId, narrative) =>
          moduleRef.get(RetroBuilderService, { strict: false }).storeNarrative(taskId, narrative),
      }),
      inject: [ModuleRef],
    },
  ],
  exports: [RETRO_PORT],
})
export class RetroPortModule {}
