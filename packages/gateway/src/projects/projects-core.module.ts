import { Module } from '@nestjs/common';

import { ProjectsRepository } from './projects.repository';

/**
 * `ProjectsRepository` on its own, split out of `ProjectsModule` (Phase 84 D).
 *
 * The repository is a leaf on the global DB handle, but `ProjectsModule` is not:
 * it pulls in `TasksModule` and `TerminalModule`. `CwdModule` needs a project's
 * stored `workDir` and nothing else, so it imports this instead — which is what
 * keeps `TasksModule → CwdModule` from closing a cycle back through
 * `ProjectsModule → TasksModule`.
 */
@Module({
  providers: [ProjectsRepository],
  exports: [ProjectsRepository],
})
export class ProjectsCoreModule {}
