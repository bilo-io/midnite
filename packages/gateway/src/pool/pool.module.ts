import { Module, forwardRef } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { ChecksModule } from '../checks/checks.module';
import { ReposModule } from '../repos/repos.module';
import { TasksModule } from '../tasks/tasks.module';
import { TerminalModule } from '../terminal/terminal.module';
import { AgentPoolScheduler } from './agent-pool-scheduler.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';
import { PoolWatchdogService } from './pool-watchdog.service';
import { LifecycleHookController } from './lifecycle-hook.controller';
import { PoolController } from './pool.controller';

@Module({
  imports: [
    AgentModule,
    ChecksModule,
    ReposModule,
    TasksModule,
    TerminalModule,
    forwardRef(() => ApprovalsModule),
  ],
  controllers: [PoolController, LifecycleHookController],
  providers: [AgentPoolService, AgentRunnerService, PoolWatchdogService, AgentPoolScheduler],
  exports: [AgentPoolService, AgentRunnerService, AgentPoolScheduler],
})
export class PoolModule {}
