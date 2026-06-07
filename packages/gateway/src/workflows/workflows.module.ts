import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { WorkflowsController } from './workflows.controller';
import { WebhookController } from './webhook.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowsRepository } from './workflows.repository';
import { WorkflowEngine } from './engine/workflow-engine.service';
import { ExecutorRegistry } from './engine/executor-registry';
import { NODE_EXECUTORS, type NodeExecutor } from './engine/node-executor';
import { HttpRequestExecutor } from './engine/executors/http-request.executor';
import { AiClaudeExecutor } from './engine/executors/ai-claude.executor';
import { WorkflowScheduler } from './scheduler/workflow-scheduler.service';

@Module({
  imports: [AgentModule],
  controllers: [WorkflowsController, WebhookController],
  providers: [
    WorkflowsService,
    WorkflowsRepository,
    WorkflowEngine,
    ExecutorRegistry,
    WorkflowScheduler,
    // Node executors — register the class, then collect all into NODE_EXECUTORS.
    // Adding an integration = add its executor class here (one place).
    HttpRequestExecutor,
    AiClaudeExecutor,
    {
      provide: NODE_EXECUTORS,
      useFactory: (...executors: NodeExecutor[]) => executors,
      inject: [HttpRequestExecutor, AiClaudeExecutor],
    },
  ],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
