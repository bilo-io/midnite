import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectDocsController } from './project-docs.controller';
import { ProjectDocsRepository } from './project-docs.repository';
import { ProjectDocsService } from './project-docs.service';

// Depends one-directionally on Projects (existence check + generation context)
// and Agent (LlmService, for generateDoc); neither depends back, so no cycle.
@Module({
  imports: [ProjectsModule, AgentModule],
  controllers: [ProjectDocsController],
  providers: [ProjectDocsService, ProjectDocsRepository],
  exports: [ProjectDocsService],
})
export class ProjectDocsModule {}
