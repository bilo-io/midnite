import { Module, forwardRef } from '@nestjs/common';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { AgentsModule } from '../agents/agents.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReposModule } from '../repos/repos.module';
import { TasksModule } from '../tasks/tasks.module';
import { ApprovalController } from './approval.controller';
import { ApprovalEventBus } from './approval-event-bus';
import { ApprovalService } from './approval.service';
import { HookSecretRepository } from './hook-secret.repository';
import { SessionPromptController } from './session-prompt.controller';
import { TerminalController } from './terminal.controller';
import { TerminalGateway } from './terminal.gateway';
import { TerminalService } from './terminal.service';
import { PtySpawner } from './spawner/pty-spawner';
import { TmuxSpawner } from './spawner/tmux-spawner';
import { SPAWNER, type Spawner } from './spawner/spawner';

@Module({
  imports: [TasksModule, ProjectsModule, AgentsModule, ReposModule, forwardRef(() => ApprovalsModule), AuthModule],
  controllers: [ApprovalController, SessionPromptController, TerminalController],
  providers: [
    TerminalService,
    ApprovalEventBus,
    ApprovalService,
    HookSecretRepository,
    TerminalGateway,
    {
      // Selected by terminal.mode: 'pty' (the default, dies with the gateway) or
      // 'tmux' (durable sessions that survive a restart). The enum is closed to
      // these two (Phase 17 §C1), so a falling-through default is just defensive.
      provide: SPAWNER,
      useFactory: (config: MidniteConfig): Spawner =>
        config.terminal.mode === 'tmux' ? new TmuxSpawner() : new PtySpawner(),
      inject: [MIDNITE_CONFIG],
    },
  ],
  exports: [TerminalService, ApprovalService, ApprovalEventBus],
})
export class TerminalModule {}
