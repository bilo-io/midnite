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
import { PrReviewCommentsRepository } from './pr-review-comments.repository';
import { PrStatusService } from './pr-status.service';
import { TasksController } from './tasks.controller';
import { TaskFailuresRepository } from './task-failures.repository';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';
import { TaskEventBusModule } from './task-event-bus.module';
import { TasksGateway } from './tasks.gateway';

@Module({
  imports: [
    AgentModule,
    AuthModule,
    ChecksModule,
    ReposModule,
    WorkflowsModule,
    WorkflowCredentialsModule,
    TaskEventBusModule,
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TasksRepository,
    TaskFailuresRepository,
    TasksGateway,
    PrStatusService,
    PrDiffService,
    PrReviewService,
    PrReviewCommentsRepository,
    AiReviewService,
    HeldTasksRegistry,
  ],
  // TaskEventBus is provided by the @Global TaskEventBusModule (Phase 62 B), so it
  // can't be re-exported as a bare provider here (Nest rejects exporting a token the
  // module doesn't itself provide — this broke full-app boot). Re-export the module
  // instead, preserving the export surface for consumers that import TasksModule.
  exports: [TasksService, TaskEventBusModule, HeldTasksRegistry],
})
export class TasksModule {}
