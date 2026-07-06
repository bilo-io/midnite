import { Module } from '@nestjs/common';

import { AgentModule } from '../agent/agent.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsageModule } from '../usage/usage.module';
import { ChatCommandService } from './chat-command.service';
import { ChatController } from './chat.controller';
import { ChatIntentService } from './chat-intent.service';

/**
 * Phase 59 — Chat to Board. Theme A: the intent spine (deterministic grammar +
 * LLM-fallback {@link ChatIntentService}). Theme B: {@link ChatCommandService}
 * executes a parsed intent by composing the existing task/breakdown/project
 * services, exposed via `POST /chat/command` + `/chat/preview`. Theme D: the
 * intent service's routing policy (local-preferred, budget-capped) reads the
 * Phase 50 hard budget cap via UsageModule. Imports AgentModule (LlmService,
 * BreakdownService), TasksModule, ProjectsModule, UsageModule.
 */
@Module({
  imports: [AgentModule, TasksModule, ProjectsModule, UsageModule],
  controllers: [ChatController],
  providers: [ChatIntentService, ChatCommandService],
  exports: [ChatIntentService, ChatCommandService],
})
export class ChatModule {}
