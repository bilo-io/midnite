import { Module } from '@nestjs/common';
import { MemoriesController } from './memories.controller';
import { MemoriesRepository } from './memories.repository';
import { MemoriesService } from './memories.service';

@Module({
  controllers: [MemoriesController],
  providers: [MemoriesService, MemoriesRepository],
  exports: [MemoriesService],
})
export class MemoriesModule {}
