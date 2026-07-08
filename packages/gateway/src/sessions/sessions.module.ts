import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { TasksModule } from '../tasks/tasks.module';
import { TerminalModule } from '../terminal/terminal.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionUsageModule } from './session-usage.module';

@Module({
  imports: [TasksModule, TerminalModule, AgentsModule, SessionUsageModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
