import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { TerminalGateway } from './terminal.gateway';
import { TerminalService } from './terminal.service';

@Module({
  imports: [TasksModule, ProjectsModule, AgentsModule],
  controllers: [ApprovalController],
  providers: [TerminalService, ApprovalService, TerminalGateway],
  exports: [TerminalService],
})
export class TerminalModule {}
