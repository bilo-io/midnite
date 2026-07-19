import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { TeamsModule } from '../teams/teams.module';
import { UsageModule } from '../usage/usage.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminReadService } from './admin-read.service';
import { BackupService } from './backup.service';

// Operational endpoints (backup) + the operator-console read layer (Phase 73 D —
// cross-tenant users/teams/overview, gated by @RequiresOperator). Imports the
// domain modules whose services AdminReadService composes. DbModule is @Global,
// so SQLITE_TOKEN resolves without an explicit import.
@Module({
  imports: [UsersModule, TeamsModule, ProjectsModule, TasksModule, UsageModule],
  controllers: [AdminController],
  providers: [BackupService, AdminReadService],
})
export class AdminModule {}
