import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReposModule } from '../repos/repos.module';
import { TasksModule } from '../tasks/tasks.module';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { TerminalController } from './terminal.controller';
import { TerminalGateway } from './terminal.gateway';
import { TerminalService } from './terminal.service';

@Module({
  imports: [TasksModule, ProjectsModule, AgentsModule, ReposModule],
  controllers: [ApprovalController, TerminalController],
  providers: [TerminalService, ApprovalService, TerminalGateway],
  exports: [TerminalService, ApprovalService],
})
export class TerminalModule {}
