import { Module, forwardRef } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { ChecksModule } from '../checks/checks.module';
import { HealthModule } from '../health/health.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReposModule } from '../repos/repos.module';
import { SessionUsageModule } from '../sessions/session-usage.module';
import { TasksModule } from '../tasks/tasks.module';
import { TerminalModule } from '../terminal/terminal.module';
import { UsageModule } from '../usage/usage.module';
import { AgentPoolScheduler } from './agent-pool-scheduler.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';
import { PoolWatchdogService } from './pool-watchdog.service';
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
    // Phase 61 A — Stop hook harvests real session tokens from the transcript.
    SessionUsageModule,
    // Phase 50 B — hard spend/rate caps: UsageService.checkBudget() gates spawns,
    // NotificationsService surfaces a held alert. Both consumed @Optional.
    UsageModule,
    NotificationsModule,
    forwardRef(() => ApprovalsModule),
    // Phase 54 D — the scheduler's readiness gate reads HealthService.dbReachable();
    // HealthModule imports PoolModule for its readiness checks, so forwardRef both.
    forwardRef(() => HealthModule),
  ],
  controllers: [PoolController, LifecycleHookController],
  providers: [
    AgentPoolService,
    AgentRunnerService,
    PoolWatchdogService,
    AgentPoolScheduler,
    WaitingNudgeService,
  ],
  exports: [AgentPoolService, AgentRunnerService, AgentPoolScheduler],
})
export class PoolModule {}
