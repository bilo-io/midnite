import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { AgentsController } from './agents.controller';
import { AgentsRepository } from './agents.repository';
import { AgentsService } from './agents.service';
import { HeartbeatScheduler } from './heartbeat-scheduler.service';

// NB: distinct from AgentModule (`agent/`) — that's the Anthropic client/classifier.
// This (`agents/`) is the orchestrator + subagents feature with the heartbeat loop.
@Module({
  imports: [AgentModule],
  controllers: [AgentsController],
  providers: [AgentsService, AgentsRepository, HeartbeatScheduler],
  exports: [AgentsService],
})
export class AgentsModule {}
