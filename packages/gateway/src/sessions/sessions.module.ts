import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [TasksModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
