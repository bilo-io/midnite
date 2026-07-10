import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { MemoriesModule } from '../memories/memories.module';
import { MemoryChatController } from './memory-chat.controller';
import { MemoryChatRepository } from './memory-chat.repository';
import { MemoryChatService } from './memory-chat.service';

/**
 * Phase 65 C — chat to the knowledge base. A dedicated module (separate from
 * memories) that grounds answers on a memory's corpus. Imports MemoriesModule for
 * the corpus read and AgentModule for the LlmService; DB/SQLite handles are global.
 */
@Module({
  imports: [MemoriesModule, AgentModule],
  controllers: [MemoryChatController],
  providers: [MemoryChatService, MemoryChatRepository],
})
export class MemoryChatModule {}
