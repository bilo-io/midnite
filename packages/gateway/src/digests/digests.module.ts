import { Module } from '@nestjs/common';

import { AgentModule } from '../agent/agent.module';
import { MetricsModule } from '../metrics/metrics.module';
import { RetroModule } from '../retro/retro.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsageModule } from '../usage/usage.module';
import { DigestRepository } from './digest.repository';
import { DigestBuilderService } from './digest-builder.service';
import { DigestsController } from './digests.controller';
import { DigestsService } from './digests.service';

/**
 * Phase 62 Theme C — fleet digests. {@link DigestBuilderService} rolls a window of
 * terminal tasks (+ their retros) up into a stored {@link DigestRepository} row,
 * folding in best-effort spend (UsageModule) + cycle-time (MetricsModule) and an
 * LLM headline (AgentModule's LlmService). Consumed by the workflow
 * `midnite.build-digest` executor via the `DIGEST_BUILDER` port (no reverse
 * `Workflows → Digests` import). DB comes from the `@Global` DbModule.
 */
@Module({
  imports: [TasksModule, RetroModule, UsageModule, MetricsModule, AgentModule],
  controllers: [DigestsController],
  providers: [DigestRepository, DigestBuilderService, DigestsService],
  exports: [DigestBuilderService, DigestsService],
})
export class DigestsModule {}
