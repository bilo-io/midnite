import { Module } from '@nestjs/common';
import { SessionUsageModule } from '../sessions/session-usage.module';
import { UsageController } from './usage.controller';
import { UsageRepository } from './usage.repository';
import { UsageService } from './usage.service';

// LLM usage & cost accounting. UsageService is exported so the AgentModule's
// LlmService can record a row per call; the controller exposes the summary +
// (Phase 61 B) cost attribution over the harvested session-usage table, hence
// the SessionUsageModule import (it exports SessionUsageService; no cycle — that
// module depends only on the DB handle + AgentsModule).
@Module({
  imports: [SessionUsageModule],
  controllers: [UsageController],
  providers: [UsageService, UsageRepository],
  exports: [UsageService],
})
export class UsageModule {}
