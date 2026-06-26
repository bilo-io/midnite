import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReposModule } from '../repos/repos.module';
import { TasksModule } from '../tasks/tasks.module';
import { PhaseDocsController } from './phase-docs.controller';
import { PhaseDocsService } from './phase-docs.service';

/**
 * Phase docs (Phase 42 Themes C+D): GitHub-backed `.midnite/phases/*.md` CRUD scoped
 * to a project, plus doc → task seeding. Auth to GitHub is via the local `gh` CLI;
 * the picked repo is resolved through {@link ReposModule}; seeding parses the doc
 * with {@link AgentModule}'s `BreakdownService` and creates edge-wired, anchor-tagged
 * tasks via {@link TasksModule}. `PhaseDocsService` is exported so a later sync-back
 * service (Theme E) can reuse its write methods.
 */
@Module({
  imports: [AuthModule, ProjectsModule, ReposModule, AgentModule, TasksModule],
  controllers: [PhaseDocsController],
  providers: [PhaseDocsService],
  exports: [PhaseDocsService],
})
export class PhaseDocsModule {}
