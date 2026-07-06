import { Module } from '@nestjs/common';

import { AgentModule } from '../agent/agent.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsageModule } from '../usage/usage.module';
import { ChatCommandsRepository } from './chat-commands.repository';
import { ChatCommandService } from './chat-command.service';
import { ChatController } from './chat.controller';
import { ChatIntentService } from './chat-intent.service';
import { ChatUndoService } from './chat-undo.service';

/**
 * Phase 59 — Chat to Board. Theme A: the intent spine (deterministic grammar +
 * LLM-fallback {@link ChatIntentService}). Theme B: {@link ChatCommandService}
 * executes a parsed intent by composing the existing task/breakdown/project
 * services, exposed via `POST /chat/command` + `/chat/preview`. Theme D: the
 * intent service's routing policy (local-preferred, budget-capped) reads the
 * Phase 50 hard budget cap via UsageModule. Theme F: the confirm-gate + the undo
 * log ({@link ChatCommandsRepository} → `chat_commands`) + {@link ChatUndoService}
 * (`POST /chat/undo`); commands are audited via the `@Global` AuditModule.
 * Imports AgentModule (LlmService, BreakdownService), TasksModule, ProjectsModule,
 * UsageModule; DB + AuditService come from their `@Global` modules.
 */
@Module({
  imports: [AgentModule, TasksModule, ProjectsModule, UsageModule],
  controllers: [ChatController],
  providers: [ChatIntentService, ChatCommandService, ChatCommandsRepository, ChatUndoService],
  exports: [ChatIntentService, ChatCommandService, ChatUndoService],
})
export class ChatModule {}
