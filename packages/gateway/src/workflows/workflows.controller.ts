import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { RoleGuard } from '../auth/role.guard';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import type { FastifyReply } from 'fastify';
import {
  REPORT_CONTENT_TYPE,
  CreateWorkflowRequestSchema,
  ReportFormatSchema,
  RunWorkflowRequestSchema,
  UpdateWorkflowRequestSchema,
  isServerRenderedReportFormat,
  type RunResponse,
  type WebhookInfoResponse,
  type WorkflowResponse,
  type WorkflowRun,
  type WorkflowSummary,
} from '@midnite/shared';
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
@UseGuards(RoleGuard)
export class WorkflowsController {
  constructor(@Inject(WorkflowsService) private readonly service: WorkflowsService) {}

  @Get()
  list(@CurrentUser() user?: CurrentUserPayload | null): WorkflowSummary[] {
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.service.listSummaries(scope);
  }

  @Post()
  @RequiresRole('member')
  create(
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload | null,
  ): WorkflowResponse {
    const parsed = CreateWorkflowRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { workflow: this.service.create(parsed.data, user?.userId) };
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user?: CurrentUserPayload | null): WorkflowResponse {
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return { workflow: this.service.getWorkflow(id, scope) };
  }

  @Patch(':id')
  @RequiresRole('admin')
  update(@Param('id') id: string, @Body() body: unknown): WorkflowResponse {
    const parsed = UpdateWorkflowRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { workflow: this.service.update(id, parsed.data) };
  }

  @Delete(':id')
  @RequiresRole('admin')
  remove(@Param('id') id: string): { ok: true } {
    this.service.delete(id);
    return { ok: true };
  }

  @Post(':id/duplicate')
  @RequiresRole('member')
  duplicate(@Param('id') id: string): WorkflowResponse {
    return { workflow: this.service.duplicate(id) };
  }

  @Post(':id/run')
  @RequiresRole('member')
  run(@Param('id') id: string, @Body() body: unknown): RunResponse {
    const parsed = RunWorkflowRequestSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { run: this.service.run(id, parsed.data.input) };
  }

  @Get(':id/runs')
  listRuns(@Param('id') id: string): WorkflowRun[] {
    return this.service.listRuns(id);
  }

  @Get(':id/runs/:runId')
  getRun(@Param('id') id: string, @Param('runId') runId: string): RunResponse {
    return { run: this.service.getRun(id, runId) };
  }

  @Get(':id/runs/:runId/export')
  exportRun(
    @Param('id') id: string,
    @Param('runId') runId: string,
    @Res({ passthrough: false }) reply: FastifyReply,
    @Query('format') format?: string,
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
    const { filename, markdown } = this.service.exportRunMarkdown(id, runId);
    void reply
      .header('content-type', REPORT_CONTENT_TYPE.md)
      .header('content-disposition', `attachment; filename="${filename}"`)
      .send(markdown);
  }

  @Post(':id/webhook/rotate')
  @RequiresRole('admin')
  rotateWebhook(@Param('id') id: string): WebhookInfoResponse {
    return this.service.rotateWebhookSecret(id);
  }
}
