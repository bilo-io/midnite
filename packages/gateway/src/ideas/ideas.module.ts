import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { SearchIndexModule } from '../search/search-index.module';
import { IdeaEventBus } from './idea-event-bus';
import { IdeaController } from './ideas.controller';
import { IdeasGateway } from './ideas.gateway';
import { IdeaRepository } from './ideas.repository';
import { IdeaService } from './ideas.service';

@Module({
  imports: [AuthModule, SearchIndexModule, AgentModule, ProjectsModule],
  controllers: [IdeaController],
  providers: [IdeaService, IdeaRepository, IdeaEventBus, IdeasGateway],
  exports: [IdeaService, IdeaEventBus],
})
export class IdeasModule {}
