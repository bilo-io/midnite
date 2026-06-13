import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { MemoriesModule } from '../memories/memories.module';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

@Module({
  imports: [AgentModule, TasksModule, KnowledgeModule, MemoriesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository],
  exports: [ProjectsService],
})
export class ProjectsModule {}
