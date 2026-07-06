import { Module } from '@nestjs/common';

import { AgentModule } from '../agent/agent.module';
import { ChatIntentService } from './chat-intent.service';

/**
 * Phase 59 — Chat to Board. Theme A ships the intent spine: the deterministic
 * grammar parser + the LLM-fallback {@link ChatIntentService}. Later themes add
 * the executor, query answerer, controller and routing policy. Imports
 * AgentModule for the provider-agnostic LlmService.
 */
@Module({
  imports: [AgentModule],
  providers: [ChatIntentService],
  exports: [ChatIntentService],
})
export class ChatModule {}
