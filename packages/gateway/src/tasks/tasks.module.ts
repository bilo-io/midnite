import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';
import { TaskEventBus } from './task-event-bus';
import { TasksGateway } from './tasks.gateway';

@Module({
  imports: [AgentModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository, TaskEventBus, TasksGateway],
  exports: [TasksService],
})
export class TasksModule {}
