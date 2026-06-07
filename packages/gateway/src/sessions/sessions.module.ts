import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { TerminalModule } from '../terminal/terminal.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [TasksModule, TerminalModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
