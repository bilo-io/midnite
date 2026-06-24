import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { TasksModule } from '../tasks/tasks.module';
import { TerminalModule } from '../terminal/terminal.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [TasksModule, TerminalModule, AgentsModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
