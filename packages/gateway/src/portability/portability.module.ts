import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';
import { CouncilsModule } from '../councils/councils.module';
import { MediaModule } from '../media/media.module';
import { MemoriesModule } from '../memories/memories.module';
import { NotesModule } from '../notes/notes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReposModule } from '../repos/repos.module';
import { RoutinesModule } from '../routines/routines.module';
import { SearchModule } from '../search/search.module';
import { TasksModule } from '../tasks/tasks.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { BackupSchedulerService } from './backup-scheduler.service';
import { PortabilityController } from './portability.controller';
import { PortabilityImportService } from './portability-import.service';
import { PortabilityService } from './portability.service';

/**
 * Phase 49 B — data portability (bulk export). A pure consumer of the portable
 * domains' services (leaf — nothing imports it, so no cycles); the DB handle is
 * global. Theme C's import service joins this module later.
 */
@Module({
  imports: [
    TasksModule,
    ProjectsModule,
    ReposModule,
    MemoriesModule,
    NotesModule,
    RoutinesModule,
    MediaModule,
    CouncilsModule,
    ApprovalsModule,
    WorkflowsModule,
    SearchModule,
    // Phase 49 F — the backup scheduler notifies on failure.
    NotificationsModule,
  ],
  controllers: [PortabilityController],
  providers: [PortabilityService, PortabilityImportService, BackupSchedulerService],
})
export class PortabilityModule {}
