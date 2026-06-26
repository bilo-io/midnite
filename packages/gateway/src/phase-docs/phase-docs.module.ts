import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReposModule } from '../repos/repos.module';
import { PhaseDocsController } from './phase-docs.controller';
import { PhaseDocsService } from './phase-docs.service';

/**
 * Phase docs (Phase 42 Theme C): GitHub-backed `.midnite/phases/*.md` CRUD scoped
 * to a project. Auth to GitHub is via the local `gh` CLI; the picked repo is
 * resolved through {@link ReposModule}. `PhaseDocsService` is exported so a later
 * sync-back service (Theme E) can reuse its write methods.
 */
@Module({
  imports: [AuthModule, ProjectsModule, ReposModule],
  controllers: [PhaseDocsController],
  providers: [PhaseDocsService],
  exports: [PhaseDocsService],
})
export class PhaseDocsModule {}
