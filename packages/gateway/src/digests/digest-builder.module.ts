import { Global, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DigestBuilderService } from './digest-builder.service';
import { DIGEST_BUILDER, type DigestBuilderPort } from './digest-builder.port';

/**
 * Binds the `DIGEST_BUILDER` port to `DigestBuilderService` for the whole app
 * (Phase 62 C). `@Global` so the workflow `midnite.build-digest` executor injects
 * the token without importing `DigestsModule` — avoiding the module cycle through
 * `TasksModule → WorkflowsModule`. Resolved lazily via `ModuleRef` at call time.
 */
@Global()
@Module({
  providers: [
    {
      provide: DIGEST_BUILDER,
      useFactory: (moduleRef: ModuleRef): DigestBuilderPort => ({
        build: (req) => moduleRef.get(DigestBuilderService, { strict: false }).build(req),
      }),
      inject: [ModuleRef],
    },
  ],
  exports: [DIGEST_BUILDER],
})
export class DigestBuilderModule {}
