import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { TasksModule } from '../tasks/tasks.module';
import { TerminalModule } from '../terminal/terminal.module';
import { AgentPoolScheduler } from './agent-pool-scheduler.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';
import { LifecycleHookController } from './lifecycle-hook.controller';
import { PoolController } from './pool.controller';

@Module({
  imports: [AgentModule, TasksModule, TerminalModule],
  controllers: [PoolController, LifecycleHookController],
  providers: [AgentPoolService, AgentRunnerService, AgentPoolScheduler],
  exports: [AgentPoolService, AgentRunnerService],
})
export class PoolModule {}
