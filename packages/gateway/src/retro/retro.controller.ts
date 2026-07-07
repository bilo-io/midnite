import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common';
import type { RetroResponse } from '@midnite/shared';

import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TasksService } from '../tasks/tasks.service';
import { RetroBuilderService } from './retro-builder.service';

/**
 * Phase 62 A — read a task's retrospective. Thin: scope-check the task (404s if
 * it isn't visible to the caller, like `GET /tasks/:id/failures`), then return
 * the stored retro or 404 when none has been built yet (retros are written on the
 * task's terminal transition, not on read).
 */
@Controller('tasks')
export class RetroController {
  constructor(
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(RetroBuilderService) private readonly retros: RetroBuilderService,
  ) {}

  @Get(':id/retro')
  getRetro(@Param('id') id: string, @CurrentUser() user?: CurrentUserPayload | null): RetroResponse {
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    this.tasks.getTask(id, scope); // 404s if the task isn't visible in scope
    const retro = this.retros.getByTaskId(id);
    if (!retro) throw new NotFoundException(`no retrospective for task ${id}`);
    return { retro };
  }
}
