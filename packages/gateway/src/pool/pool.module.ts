import { Module, forwardRef } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { ChecksModule } from '../checks/checks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReposModule } from '../repos/repos.module';
import { TasksModule } from '../tasks/tasks.module';
import { TerminalModule } from '../terminal/terminal.module';
import { UsageModule } from '../usage/usage.module';
import { AgentPoolScheduler } from './agent-pool-scheduler.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';
import { LifecycleHookController } from './lifecycle-hook.controller';
import { PoolController } from './pool.controller';
import { WaitingNudgeService } from './waiting-nudge.service';

@Module({
  imports: [
    AgentModule,
    ChecksModule,
    ReposModule,
    TasksModule,
    TerminalModule,
    // Phase 50 B — hard spend/rate caps: UsageService.checkBudget() gates spawns,
    // NotificationsService surfaces a held alert. Both consumed @Optional.
    UsageModule,
    NotificationsModule,
    forwardRef(() => ApprovalsModule),
  ],
  controllers: [PoolController, LifecycleHookController],
  providers: [AgentPoolService, AgentRunnerService, AgentPoolScheduler, WaitingNudgeService],
  exports: [AgentPoolService, AgentRunnerService, AgentPoolScheduler],
})
export class PoolModule {}
