import { Module } from '@nestjs/common';
import { TerminalModule } from '../terminal/terminal.module';
import { TaskDoctorController } from './task-doctor.controller';
import { TasksDoctorService } from './tasks-doctor.service';
import { TasksModule } from './tasks.module';

/**
 * Phase 53 Theme E — the task-health / doctor surface. Its own module because the
 * doctor report needs BOTH `TasksService` (from `TasksModule`) and
 * `TerminalService` (from `TerminalModule`, which already imports `TasksModule`).
 * Putting the dependency here — rather than in `TasksModule` — keeps `tasks` from
 * depending on `terminal` (which would be a cycle).
 */
@Module({
  imports: [TasksModule, TerminalModule],
  controllers: [TaskDoctorController],
  providers: [TasksDoctorService],
})
export class TaskHealthModule {}
