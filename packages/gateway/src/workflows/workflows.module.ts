import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { AuthModule } from '../auth/auth.module';
import { WorkflowsController } from './workflows.controller';
import { WebhookController } from './webhook.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowsRepository } from './workflows.repository';
import { WorkflowStorageRepository } from './workflow-storage.repository';
import { WorkflowStorageService } from './workflow-storage.service';
import { WorkflowEngine } from './engine/workflow-engine.service';
import { ExecutorRegistry } from './engine/executor-registry';
import { NODE_EXECUTORS, type NodeExecutor } from './engine/node-executor';
import { HttpRequestExecutor } from './engine/executors/http-request.executor';
import { AiClaudeExecutor } from './engine/executors/ai-claude.executor';
import { SetDataExecutor } from './engine/executors/set-data.executor';
import { MergeExecutor } from './engine/executors/merge.executor';
import { DataFilterExecutor } from './engine/executors/data-filter.executor';
import { StorageSetExecutor } from './engine/executors/storage-set.executor';
import { StorageGetExecutor } from './engine/executors/storage-get.executor';
import { SlackMessageExecutor } from './engine/executors/slack-message.executor';
import { EmailSendExecutor } from './engine/executors/email-send.executor';
import { GithubGetPrExecutor } from './engine/executors/github-get-pr.executor';
import { GithubGetDiffExecutor } from './engine/executors/github-get-diff.executor';
import { GithubPostReviewExecutor } from './engine/executors/github-post-review.executor';
import { TaskCreateExecutor } from './engine/executors/task-create.executor';
import { GenerateRetroExecutor } from './engine/executors/generate-retro.executor';
import { ListCompletedTasksExecutor } from './engine/executors/list-completed-tasks.executor';
import { BuildDigestExecutor } from './engine/executors/build-digest.executor';
import { NotifyExecutor } from './engine/executors/notify.executor';
import { WorkflowCredentialsModule } from './credentials/workflow-credentials.module';
import { WorkflowTaskEventTriggerService } from './workflow-task-event-trigger.service';
import { WorkflowEventBus } from './workflow-event-bus';
import { WorkflowRecoveryService } from './workflow-recovery.service';
import { WorkflowsGateway } from './workflows.gateway';

@Module({
  imports: [AgentModule, AuthModule, WorkflowCredentialsModule],
  controllers: [WorkflowsController, WebhookController],
  providers: [
    WorkflowsService,
    WorkflowsRepository,
    WorkflowStorageRepository,
    WorkflowStorageService,
    WorkflowEngine,
    ExecutorRegistry,
    WorkflowTaskEventTriggerService,
    WorkflowEventBus,
    WorkflowRecoveryService,
    WorkflowsGateway,
    // Node executors — register the class, then collect all into NODE_EXECUTORS.
    // Adding an integration = add its executor class here (one place).
    HttpRequestExecutor,
    AiClaudeExecutor,
    SetDataExecutor,
    MergeExecutor,
    DataFilterExecutor,
    StorageSetExecutor,
    StorageGetExecutor,
    SlackMessageExecutor,
    EmailSendExecutor,
    GithubGetPrExecutor,
    GithubGetDiffExecutor,
    GithubPostReviewExecutor,
    TaskCreateExecutor,
    GenerateRetroExecutor,
    ListCompletedTasksExecutor,
    BuildDigestExecutor,
    NotifyExecutor,
    {
      provide: NODE_EXECUTORS,
      useFactory: (...executors: NodeExecutor[]) => executors,
      inject: [
        HttpRequestExecutor,
        AiClaudeExecutor,
        SetDataExecutor,
        MergeExecutor,
        DataFilterExecutor,
        StorageSetExecutor,
        StorageGetExecutor,
        SlackMessageExecutor,
        EmailSendExecutor,
        GithubGetPrExecutor,
        GithubGetDiffExecutor,
        GithubPostReviewExecutor,
        TaskCreateExecutor,
        GenerateRetroExecutor,
        ListCompletedTasksExecutor,
        BuildDigestExecutor,
        NotifyExecutor,
      ],
    },
  ],
  exports: [WorkflowsService, WorkflowEventBus],
})
export class WorkflowsModule {}
