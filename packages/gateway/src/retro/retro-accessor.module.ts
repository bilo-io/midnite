import { Global, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Task } from '@midnite/shared';
import { TasksService } from '../tasks/tasks.service';
import { SessionsService } from '../sessions/sessions.service';
import { sliceTranscript } from '../sessions/lib/transcript-slice';
import { RetroBuilderService } from './retro-builder.service';
import { RETRO_ACCESSOR, type RetroAccessor, type RetroForNarrative } from './retro-accessor';

/**
 * Binds the `RETRO_ACCESSOR` port for the whole app (Phase 62 C). `@Global` so the
 * workflow `midnite.generate-retro` executor injects the token without importing
 * `RetroModule`/`SessionsModule` — avoiding the module cycle through `TasksModule
 * → WorkflowsModule`. The three collaborating services are resolved lazily via
 * `ModuleRef` at call time (all are registered elsewhere in the app), so this
 * provider adds no construction-time dependency.
 */
@Global()
@Module({
  providers: [
    {
      provide: RETRO_ACCESSOR,
      useFactory: (moduleRef: ModuleRef): RetroAccessor => ({
        async loadForNarrative(taskId: string): Promise<RetroForNarrative | undefined> {
          const builder = moduleRef.get(RetroBuilderService, { strict: false });
          let retro = builder.getByTaskId(taskId);
          if (!retro) {
            const task = moduleRef
              .get(TasksService, { strict: false })
              .listTasks()
              .find((t: Task) => t.id === taskId);
            if (!task || (task.status !== 'done' && task.status !== 'abandoned')) return undefined;
            retro = builder.buildAndStore(task);
          }
          let transcriptExcerpt = '';
          try {
            const sessions = moduleRef.get(SessionsService, { strict: false });
            const transcript = await sessions.transcript('task', taskId);
            transcriptExcerpt = sliceTranscript(transcript.messages);
          } catch {
            // Missing/unreadable transcript — fail soft to a skeleton-only narrative.
            transcriptExcerpt = '';
          }
          return { retro, transcriptExcerpt };
        },
        storeNarrative(taskId, narrative): void {
          moduleRef.get(RetroBuilderService, { strict: false }).storeNarrative(taskId, narrative);
        },
      }),
      inject: [ModuleRef],
    },
  ],
  exports: [RETRO_ACCESSOR],
})
export class RetroAccessorModule {}
