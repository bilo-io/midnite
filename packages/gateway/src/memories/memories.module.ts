import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { MemoriesController } from './memories.controller';
import { MemoriesRepository } from './memories.repository';
import { MemoriesService } from './memories.service';
import { MemoryIngestionService } from './memory-ingestion.service';
import { MemoryArtifactsRepository } from './memory-artifacts.repository';
import { MemoryStudioController } from './memory-studio.controller';
import { MemoryStudioService } from './memory-studio.service';

// AgentModule is imported for the LlmService the Studio (Phase 65 D) generates
// artifacts with; the DB + SearchIndex handles come from their `@Global` modules.
@Module({
  imports: [AgentModule],
  controllers: [MemoriesController, MemoryStudioController],
  providers: [
    MemoriesService,
    MemoriesRepository,
    MemoryIngestionService,
    MemoryArtifactsRepository,
    MemoryStudioService,
  ],
  exports: [MemoriesService],
})
export class MemoriesModule {}
