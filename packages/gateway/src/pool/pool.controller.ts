import { Controller, Get, Inject, Param, Post } from '@nestjs/common';
import type { AgentPoolSnapshot } from '@midnite/shared';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';

@Controller()
export class PoolController {
  constructor(
    @Inject(AgentPoolService) private readonly pool: AgentPoolService,
    @Inject(AgentRunnerService) private readonly runner: AgentRunnerService,
  ) {}

  @Get('pool')
  getPool(): AgentPoolSnapshot {
    return this.pool.snapshot();
  }

  @Post('tasks/:id/cancel')
  cancel(@Param('id') id: string): { ok: true } {
    this.runner.cancel(id);
    return { ok: true };
  }
}
