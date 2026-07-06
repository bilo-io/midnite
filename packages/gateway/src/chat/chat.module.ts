import { Module } from '@nestjs/common';

import { AgentModule } from '../agent/agent.module';
import { TasksModule } from '../tasks/tasks.module';
import { ChatIntentService } from './chat-intent.service';
import { ChatQueryController } from './chat-query.controller';
import { ChatQueryService } from './chat-query.service';

/**
 * Phase 59 — Chat to Board. Theme A ships the intent spine: the deterministic
 * grammar parser + the LLM-fallback {@link ChatIntentService}. Theme C adds the
 * read-only query answerer ({@link ChatQueryService}) + its `POST /chat/query`
 * endpoint. Imports AgentModule for the provider-agnostic LlmService and
 * TasksModule for the board reads. Later themes add the executor + routing.
 */
@Module({
  imports: [AgentModule, TasksModule],
  controllers: [ChatQueryController],
  providers: [ChatIntentService, ChatQueryService],
  exports: [ChatIntentService, ChatQueryService],
})
export class ChatModule {}
