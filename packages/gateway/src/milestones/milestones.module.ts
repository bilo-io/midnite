import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { MilestonesController } from './milestones.controller';
import { MilestonesRepository } from './milestones.repository';
import { MilestonesService } from './milestones.service';

// Phase 58 D — depends one-directionally on Projects (scope validation) + Tasks
// (assignment / roadmap / delete-cleanup); neither depends back, so no cycle.
@Module({
  imports: [AuthModule, ProjectsModule, TasksModule],
  controllers: [MilestonesController],
  providers: [MilestonesService, MilestonesRepository],
  exports: [MilestonesService],
})
export class MilestonesModule {}
