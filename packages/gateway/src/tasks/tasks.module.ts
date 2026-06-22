import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { ReposModule } from '../repos/repos.module';
import { TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';
import { TaskEventBus } from './task-event-bus';
import { TasksGateway } from './tasks.gateway';

@Module({
  imports: [AgentModule, ReposModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository, TaskEventBus, TasksGateway],
  exports: [TasksService, TaskEventBus],
})
export class TasksModule {}
