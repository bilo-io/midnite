import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { ProjectsCoreModule } from '../projects/projects-core.module';
import { ReposModule } from '../repos/repos.module';
import { CwdResolverService } from './cwd-resolver.service';

/**
 * The single working-directory resolver (Phase 84 Theme D), shared by the
 * terminal (agent PTYs) and tasks (manual quality-gate runs).
 *
 * Imports only leaf-ish modules on purpose — see `ProjectsCoreModule` — so both
 * consumers can depend on it without a `forwardRef`.
 */
@Module({
  imports: [ProjectsCoreModule, ReposModule, AgentsModule],
  providers: [CwdResolverService],
  exports: [CwdResolverService],
})
export class CwdModule {}
