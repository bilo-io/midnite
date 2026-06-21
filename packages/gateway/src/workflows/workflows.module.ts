import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
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
import { WorkflowScheduler } from './scheduler/workflow-scheduler.service';
import { WorkflowEventBus } from './workflow-event-bus';
import { WorkflowsGateway } from './workflows.gateway';

@Module({
  imports: [AgentModule],
  controllers: [WorkflowsController, WebhookController],
  providers: [
    WorkflowsService,
    WorkflowsRepository,
    WorkflowStorageRepository,
    WorkflowStorageService,
    WorkflowEngine,
    ExecutorRegistry,
    WorkflowScheduler,
    WorkflowEventBus,
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
      ],
    },
  ],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
