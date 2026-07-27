import { Module, forwardRef } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { MemoriesModule } from '../memories/memories.module';
import { TasksModule } from '../tasks/tasks.module';
import { TerminalModule } from '../terminal/terminal.module';
import { ProjectSourcesMigrationService } from './project-sources-migration.service';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    AgentModule,
    TasksModule,
    MemoriesModule,
    // forwardRef: TerminalModule imports ProjectsModule back (cwd resolution for
    // session PTYs) — see terminal.module.ts's matching forwardRef.
    forwardRef(() => TerminalModule),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository, ProjectSourcesMigrationService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
