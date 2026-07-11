import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  isServerRenderedReportFormat,
  ReportFormatSchema,
  type RetroResponse,
} from '@midnite/shared';

import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { sendMarkdownReport } from '../lib/report-response';
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

  // Export the retrospective as a portable markdown document (Phase 62 F). `pdf`
  // is rendered client-side from this markdown (print-to-PDF), so only `md` is
  // served here — matching the task/council/run export routes.
  @Get(':id/retro/export')
  exportRetro(
    @Param('id') id: string,
    @Res({ passthrough: false }) reply: FastifyReply,
    @Query('format') format?: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): void {
    const parsed = ReportFormatSchema.safeParse(format ?? 'md');
    if (!parsed.success) {
      throw new BadRequestException(`unsupported export format: ${String(format)}`);
    }
    if (!isServerRenderedReportFormat(parsed.data)) {
      throw new BadRequestException(
        `${parsed.data} is rendered client-side (print-to-PDF); request format=md`,
      );
    }
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    const task = this.tasks.getTask(id, scope); // 404s if not visible in scope
    const { filename, markdown } = this.retros.exportMarkdown(task);
    sendMarkdownReport(reply, filename, markdown);
  }
}
