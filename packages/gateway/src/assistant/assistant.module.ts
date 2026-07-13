import { Module } from '@nestjs/common';

import { AgentModule } from '../agent/agent.module';
import { MetricsModule } from '../metrics/metrics.module';
import { PoolModule } from '../pool/pool.module';
import { SessionsModule } from '../sessions/sessions.module';
import { TasksModule } from '../tasks/tasks.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

/**
 * Phase 66 E — the read-only fleet assistant. {@link AssistantService} composes
 * the existing read paths (tasks, sessions, agent pool, metrics) into a bounded
 * context and asks {@link LlmService} (from AgentModule) to answer as ordered
 * blocks; exposed via `POST /assistant/query`. No new mutation path, no new
 * provider code — it's a read + one LLM call, feature-tagged `assistant`.
 */
@Module({
  imports: [AgentModule, TasksModule, SessionsModule, PoolModule, MetricsModule],
  controllers: [AssistantController],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
