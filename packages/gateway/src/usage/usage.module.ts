import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { UsageRepository } from './usage.repository';
import { UsageService } from './usage.service';

// LLM usage & cost accounting. UsageService is exported so the AgentModule's
// LlmService can record a row per call; the controller exposes the summary.
@Module({
  controllers: [UsageController],
  providers: [UsageService, UsageRepository],
  exports: [UsageService],
})
export class UsageModule {}
