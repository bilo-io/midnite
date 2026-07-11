import { Global, Module, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Status, TaskSummary } from '@midnite/shared';

import { TasksService } from './tasks.service';
import { TASK_READER, type CompletedTasksQuery, type TaskReader } from './task-reader';

const TERMINAL: Status[] = ['done', 'abandoned'];

/**
 * Binds the `TASK_READER` port to `TasksService` app-wide. `@Global` so the
 * workflow retro/digest executors inject the token without importing
 * `TasksModule` — avoiding the `Tasks ↔ Workflows` module cycle. Resolves
 * `TasksService` lazily via `ModuleRef` (no construction-time dependency).
 */
@Global()
@Module({
  providers: [
    {
      provide: TASK_READER,
      useFactory: (moduleRef: ModuleRef): TaskReader => ({
        getTask: (id) => {
          try {
            return moduleRef.get(TasksService, { strict: false }).getTask(id);
          } catch (err) {
            // getTask throws NotFoundException for an unknown id — the port
            // reports "no such task" as undefined. A real fault (DB error) must
            // still surface, so only NotFound is swallowed.
            if (err instanceof NotFoundException) return undefined;
            throw err;
          }
        },
        listCompleted: (query: CompletedTasksQuery): TaskSummary[] => {
          const svc = moduleRef.get(TasksService, { strict: false });
          const rows = TERMINAL.flatMap((status) => svc.listTasks(status, query.projectId));
          return rows
            .filter((t) => {
              const at = t.updatedAt ?? t.createdAt;
              if (!at || at < query.from || at > query.to) return false;
              if (query.repo && t.repo !== query.repo) return false;
              return true;
            })
            .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
            .map((t) => ({
              id: t.id,
              title: t.title,
              kind: t.kind,
              status: t.status,
              priority: t.priority,
              retryCount: t.retryCount,
              repo: t.repo,
              projectId: t.projectId,
              tags: t.tags ?? [],
              prUrl: t.prUrl,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
            }));
        },
      }),
      inject: [ModuleRef],
    },
  ],
  exports: [TASK_READER],
})
export class TaskReaderModule {}
