import { Controller, Get } from '@nestjs/common';
import type { TasksDoctorReport } from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TasksDoctorService } from './tasks-doctor.service';

/**
 * Phase 53 Theme E — the task-health report endpoint. Shares the `/tasks` prefix
 * with `TasksController`; `doctor` is a static segment so find-my-way routes it
 * ahead of `/tasks/:id`. Read-only; scoped to the caller's team like the task list.
 */
@Controller('tasks')
export class TaskDoctorController {
  constructor(private readonly doctor: TasksDoctorService) {}

  @Get('doctor')
  report(@CurrentUser() user?: CurrentUserPayload | null): TasksDoctorReport {
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.doctor.report(scope);
  }
}
