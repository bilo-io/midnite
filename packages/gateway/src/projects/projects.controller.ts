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
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import type { FastifyReply } from 'fastify';
import {
  CreateFromBreakdownRequestSchema,
  CreatePlanTasksRequestSchema,
  CreateProjectRequestSchema,
  EnhanceDescriptionRequestSchema,
  REPORT_CONTENT_TYPE,
  ReportFormatSchema,
  UpdatePlanRequestSchema,
  UpdateProjectRequestSchema,
  PageQuerySchema,
  isServerRenderedReportFormat,
  type BreakdownPreviewResponse,
  type CreateFromBreakdownResponse,
  type CreatePlanTasksResponse,
  type DraftPlanResponse,
  type EnhanceDescriptionResponse,
  type Project,
  type ProjectResponse,
  type ProjectsPage,
} from '@midnite/shared';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly service: ProjectsService) {}

  // Project **page** (Phase 57 C follow-up): `{ items, total }`. `page`/`limit`
  // optional — omitted returns every project (the full `Project` shape).
  @Get()
  list(
    @Query() rawQuery: Record<string, string>,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): ProjectsPage {
    const parsed = PageQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'invalid project query');
    }
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.service.listProjectPage(scope, parsed.data);
  }

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<ProjectResponse> {
    const parsed = CreateProjectRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { project: await this.service.createProject(parsed.data, user?.userId, user?.teamId) };
  }

  // Stateless — used by the create modal before the project exists.
  @Post('ai/enhance-description')
  async enhanceDescription(@Body() body: unknown): Promise<EnhanceDescriptionResponse> {
    const parsed = EnhanceDescriptionRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { description: await this.service.enhanceDescription(parsed.data) };
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user?: CurrentUserPayload | null): Project {
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.service.getProject(id, scope);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): ProjectResponse {
    const parsed = UpdateProjectRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { project: this.service.updateProject(id, parsed.data, user?.userId ?? null) };
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user?: CurrentUserPayload | null): { ok: true } {
    this.service.deleteProject(id, user?.userId ?? null);
    return { ok: true };
  }

  @Post(':id/draft-plan')
  draftPlan(@Param('id') id: string): Promise<DraftPlanResponse> {
    return this.service.draftPlan(id);
  }

  // Structured breakdown (Phase 28 Theme A): generate a typed, dependency-aware
  // task list from the project's description + existing plan. Preview-only —
  // the client edits and confirms before calling create-from-breakdown.
  @Post(':id/plan/draft-breakdown')
  draftBreakdown(@Param('id') id: string): Promise<BreakdownPreviewResponse> {
    return this.service.draftBreakdown(id);
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
      tasks: this.service.createTasksFromBreakdown(
        id,
        parsed.data.breakdown,
        parsed.data.repo,
        parsed.data.milestoneId,
      ),
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
