import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { AuthModule } from '../auth/auth.module';
import { ChecksModule } from '../checks/checks.module';
import { ReposModule } from '../repos/repos.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { WorkflowCredentialsModule } from '../workflows/credentials/workflow-credentials.module';
import { AiReviewService } from './ai-review.service';
import { HeldTasksRegistry } from './held-tasks.registry';
import { PrDiffService } from './pr-diff.service';
import { PrReviewService } from './pr-review.service';
import { PrStatusService } from './pr-status.service';
import { TasksController } from './tasks.controller';
import { TaskFailuresRepository } from './task-failures.repository';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';
import { TaskEventBus } from './task-event-bus';
import { TasksGateway } from './tasks.gateway';

@Module({
  imports: [AgentModule, AuthModule, ChecksModule, ReposModule, WorkflowsModule, WorkflowCredentialsModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    TasksRepository,
    TaskFailuresRepository,
    TaskEventBus,
    TasksGateway,
    PrStatusService,
    PrDiffService,
    PrReviewService,
    AiReviewService,
    HeldTasksRegistry,
  ],
  exports: [TasksService, TaskEventBus, HeldTasksRegistry],
})
export class TasksModule {}
