import {
  ConflictException,
  Controller,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import type { AgentPoolSnapshot, Task } from '@midnite/shared';
import { TasksService } from '../tasks/tasks.service';
import { AgentPoolService } from './agent-pool.service';
import { AgentRunnerService } from './agent-runner.service';

@Controller()
export class PoolController {
  constructor(
    @Inject(AgentPoolService) private readonly pool: AgentPoolService,
    @Inject(AgentRunnerService) private readonly runner: AgentRunnerService,
    @Inject(TasksService) private readonly tasks: TasksService,
  ) {}

  @Get('pool')
  getPool(): AgentPoolSnapshot {
    return this.pool.snapshot();
  }

  // Manually kick off an agent run for a task. The autonomous scheduler does the
  // same thing for `todo` tasks when `agent.poolEnabled`, but this lets a user
  // start a run on demand (Start button / drag-to-WIP) regardless of that flag —
  // the slot pool exists independent of the scheduler.
  @Post('tasks/:id/start')
  async start(@Param('id') id: string): Promise<Task> {
    const task = this.tasks.getTask(id); // 404s if missing
    // Only startable from a not-yet-running column, and never if a slot already
    // holds it — avoids double-spawning a session for one task.
    if (task.status !== 'todo' && task.status !== 'backlog') {
      throw new ConflictException(`task ${id} is not startable (status: ${task.status})`);
    }
    if (this.pool.slotForTask(id)) {
      throw new ConflictException(`task ${id} is already running`);
    }
    const started = await this.runner.start(task);
    if (!started) {
      throw new ConflictException('no free agent slot');
    }
    return this.tasks.getTask(id);
  }

  @Post('tasks/:id/cancel')
  cancel(@Param('id') id: string): { ok: true } {
    this.runner.cancel(id);
    return { ok: true };
  }
}
