import { Module } from '@nestjs/common';

import { TasksRepository } from './tasks.repository';

/**
 * `TasksRepository` on its own, split out of `TasksModule` (Phase 84 E).
 *
 * Mirrors `ProjectsCoreModule` and exists for the same reason: the repository is a leaf
 * on the global DB handle, but `TasksModule` is not — it pulls in agents, checks, repos,
 * workflows and the credential vault. `GithubModule` needs a task's title, prompt and
 * team to create a Projects v2 draft item from it, and nothing else; importing all of
 * `TasksModule` for that would be both heavy and a standing cycle risk, since
 * `TasksModule` already imports `GithubTokenModule`.
 */
@Module({
  providers: [TasksRepository],
  exports: [TasksRepository],
})
export class TasksCoreModule {}
