import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReposModule } from '../repos/repos.module';
import { TasksModule } from '../tasks/tasks.module';
import { PhaseDocsController } from './phase-docs.controller';
import { PhaseDocsService } from './phase-docs.service';
import { PhaseDocSyncService } from './phase-doc-sync.service';

/**
 * Phase docs (Phase 40 Themes E+F+G): GitHub-backed `.midnite/phases/*.md` CRUD scoped
 * to a project, plus doc → task seeding and board → doc sync-back. Auth to GitHub is via
 * the local `gh` CLI; the picked repo is resolved through {@link ReposModule}; seeding
 * parses the doc with {@link AgentModule}'s `BreakdownService` and creates edge-wired,
 * anchor-tagged tasks via {@link TasksModule}. `PhaseDocSyncService` subscribes to the
 * `TaskEventBus` (Theme G) and ticks checkboxes back as seeded tasks complete.
 */
@Module({
  imports: [AuthModule, ProjectsModule, ReposModule, AgentModule, TasksModule],
  controllers: [PhaseDocsController],
  providers: [PhaseDocsService, PhaseDocSyncService],
  exports: [PhaseDocsService],
})
export class PhaseDocsModule {}
