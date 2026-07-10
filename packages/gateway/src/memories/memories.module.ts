import { Module } from '@nestjs/common';
import { MemoriesController } from './memories.controller';
import { MemoriesRepository } from './memories.repository';
import { MemoriesService } from './memories.service';
import { MemoryIngestionService } from './memory-ingestion.service';

@Module({
  controllers: [MemoriesController],
  providers: [MemoriesService, MemoriesRepository, MemoryIngestionService],
  exports: [MemoriesService],
})
export class MemoriesModule {}
