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
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  AddSourceRequestSchema,
  CreateFromBreakdownRequestSchema,
  CreatePlanTasksRequestSchema,
  CreateProjectRequestSchema,
  EnhanceDescriptionRequestSchema,
  REPORT_CONTENT_TYPE,
  ReorderSourcesRequestSchema,
  ReportFormatSchema,
  UpdatePlanRequestSchema,
  UpdateProjectRequestSchema,
  isServerRenderedReportFormat,
  type CreateFromBreakdownResponse,
  type CreatePlanTasksResponse,
  type DraftPlanResponse,
  type EnhanceDescriptionResponse,
  type Project,
  type ProjectResponse,
} from '@midnite/shared';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly service: ProjectsService) {}

  @Get()
  list(): Project[] {
    return this.service.listProjects();
  }

  @Post()
  async create(@Body() body: unknown): Promise<ProjectResponse> {
    const parsed = CreateProjectRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { project: await this.service.createProject(parsed.data) };
  }

  // Stateless — used by the create modal before the project exists.
  @Post('ai/enhance-description')
  async enhanceDescription(@Body() body: unknown): Promise<EnhanceDescriptionResponse> {
    const parsed = EnhanceDescriptionRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { description: await this.service.enhanceDescription(parsed.data) };
  }

  @Get(':id')
  get(@Param('id') id: string): Project {
    return this.service.getProject(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown): ProjectResponse {
    const parsed = UpdateProjectRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { project: this.service.updateProject(id, parsed.data) };
  }

  @Delete(':id')
  remove(@Param('id') id: string): { ok: true } {
    this.service.deleteProject(id);
    return { ok: true };
  }

  @Post(':id/sources')
  async addSource(@Param('id') id: string, @Body() body: unknown): Promise<ProjectResponse> {
    const parsed = AddSourceRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { project: await this.service.addSource(id, parsed.data.url) };
  }

  // Static segment, so it never collides with `:sourceId` below.
  @Post(':id/sources/reorder')
  reorderSources(@Param('id') id: string, @Body() body: unknown): ProjectResponse {
    const parsed = ReorderSourcesRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { project: this.service.reorderSources(id, parsed.data.sourceIds) };
  }

  @Delete(':id/sources/:sourceId')
  removeSource(
    @Param('id') id: string,
    @Param('sourceId') sourceId: string,
  ): ProjectResponse {
    return { project: this.service.removeSource(id, sourceId) };
  }

  @Post(':id/draft-plan')
  draftPlan(@Param('id') id: string): Promise<DraftPlanResponse> {
    return this.service.draftPlan(id);
  }

  @Patch(':id/plan')
  updatePlan(@Param('id') id: string, @Body() body: unknown): ProjectResponse {
    const parsed = UpdatePlanRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { project: this.service.updatePlan(id, parsed.data.plan) };
  }

  @Post(':id/plan/create-tasks')
  createPlanTasks(@Param('id') id: string, @Body() body: unknown): CreatePlanTasksResponse {
    const parsed = CreatePlanTasksRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { tasks: this.service.createTasksFromPlan(id, parsed.data.titles) };
  }

  // Structured create (Phase 28 Theme B): turn a confirmed/edited `Breakdown`
  // into the project's dependency-wired board. Thin — validate, delegate.
  @Post(':id/plan/create-from-breakdown')
  createFromBreakdown(
    @Param('id') id: string,
    @Body() body: unknown,
  ): CreateFromBreakdownResponse {
    const parsed = CreateFromBreakdownRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return {
      tasks: this.service.createTasksFromBreakdown(id, parsed.data.breakdown, parsed.data.repo),
    };
  }

  @Get(':id/export')
  exportProject(
    @Param('id') id: string,
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
    const { filename, markdown } = this.service.exportMarkdown(id);
    void reply
      .header('content-type', REPORT_CONTENT_TYPE.md)
      .header('content-disposition', `attachment; filename="${filename}"`)
      .send(markdown);
  }
}
