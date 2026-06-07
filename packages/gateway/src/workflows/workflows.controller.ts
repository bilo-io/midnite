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
} from '@nestjs/common';
import {
  CreateWorkflowRequestSchema,
  RunWorkflowRequestSchema,
  UpdateWorkflowRequestSchema,
  type RunResponse,
  type WebhookInfoResponse,
  type WorkflowResponse,
  type WorkflowRun,
  type WorkflowSummary,
} from '@midnite/shared';
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
export class WorkflowsController {
  constructor(@Inject(WorkflowsService) private readonly service: WorkflowsService) {}

  @Get()
  list(): WorkflowSummary[] {
    return this.service.listSummaries();
  }

  @Post()
  create(@Body() body: unknown): WorkflowResponse {
    const parsed = CreateWorkflowRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { workflow: this.service.create(parsed.data) };
  }

  @Get(':id')
  get(@Param('id') id: string): WorkflowResponse {
    return { workflow: this.service.getWorkflow(id) };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown): WorkflowResponse {
    const parsed = UpdateWorkflowRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { workflow: this.service.update(id, parsed.data) };
  }

  @Delete(':id')
  remove(@Param('id') id: string): { ok: true } {
    this.service.delete(id);
    return { ok: true };
  }

  @Post(':id/run')
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

  @Post(':id/webhook/rotate')
  rotateWebhook(@Param('id') id: string): WebhookInfoResponse {
    return this.service.rotateWebhookSecret(id);
  }
}
