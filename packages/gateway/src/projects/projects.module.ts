import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { MemoriesModule } from '../memories/memories.module';
import { TasksModule } from '../tasks/tasks.module';
import { TerminalModule } from '../terminal/terminal.module';
import { ProjectSourcesMigrationService } from './project-sources-migration.service';
import { ProjectsCoreModule } from './projects-core.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    AgentModule,
    TasksModule,
    MemoriesModule,
    ProjectsCoreModule,
    // Phase 84 D retired the forwardRef here: TerminalModule no longer imports
    // ProjectsModule (cwd resolution moved to CwdModule, which reaches the
    // stored workDir through ProjectsCoreModule), so this edge is one-way again
    // — ProjectsService → TerminalService for Preview/Build ad-hoc terminals.
    TerminalModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectSourcesMigrationService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
