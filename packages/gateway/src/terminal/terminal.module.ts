import { Module } from '@nestjs/common';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { AgentsModule } from '../agents/agents.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReposModule } from '../repos/repos.module';
import { TasksModule } from '../tasks/tasks.module';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { TerminalController } from './terminal.controller';
import { TerminalGateway } from './terminal.gateway';
import { TerminalService } from './terminal.service';
import { PtySpawner } from './spawner/pty-spawner';
import { SPAWNER } from './spawner/spawner';

@Module({
  imports: [TasksModule, ProjectsModule, AgentsModule, ReposModule],
  controllers: [ApprovalController, TerminalController],
  providers: [
    TerminalService,
    ApprovalService,
    TerminalGateway,
    {
      // Selected by terminal.mode. Only 'pty' is implemented today; the other
      // modes (tmux/warp/iterm) fall back to PtySpawner until their backends land.
      provide: SPAWNER,
      useFactory: (_config: MidniteConfig) => new PtySpawner(),
      inject: [MIDNITE_CONFIG],
    },
  ],
  exports: [TerminalService, ApprovalService],
})
export class TerminalModule {}
