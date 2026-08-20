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
  AttachProjectRepoRequestSchema,
  CreateFromBreakdownRequestSchema,
  CreatePlanTasksRequestSchema,
  CreateProjectRequestSchema,
  DraftBreakdownRequestSchema,
  EnhanceDescriptionRequestSchema,
  REPORT_CONTENT_TYPE,
  ReportFormatSchema,
  RunProjectCommandRequestSchema,
  SetProjectRepoPrimaryRequestSchema,
  UpdatePlanRequestSchema,
  UpdateProjectRequestSchema,
  PageQuerySchema,
  isServerRenderedReportFormat,
  type BreakdownPreviewResponse,
  type CreateFromBreakdownResponse,
  type CreatePlanTasksResponse,
  type DraftPlanResponse,
  type EnhanceDescriptionResponse,
  type InstallTerminalResponse,
  type Project,
  type ProjectRepo,
  type ProjectResponse,
  type ProjectsPage,
  type RepoStatusResponse,
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
  // the client edits and confirms before calling create-from-breakdown. `overview`
  // (draft-plan Stage 1's approved output) is optional, so a bare/empty body is
  // still valid — this route previously took no body at all.
  @Post(':id/plan/draft-breakdown')
  draftBreakdown(@Param('id') id: string, @Body() body: unknown): Promise<BreakdownPreviewResponse> {
    const parsed = DraftBreakdownRequestSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.draftBreakdown(id, parsed.data.overview);
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

  // Preview/Launch action: open a live ad-hoc terminal running the project's
  // configured startCommand — or, with `{ background: true }`, run it eagerly as
  // a gateway child process. The command itself always comes from the persisted
  // project config, never the client; the body only picks how it runs.
  @Post(':id/preview')
  preview(@Param('id') id: string, @Body() body: unknown): InstallTerminalResponse {
    const parsed = RunProjectCommandRequestSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.previewProject(id, parsed.data);
  }

  // Build action: same shape as preview, running buildCommand instead.
  @Post(':id/build')
  build(@Param('id') id: string, @Body() body: unknown): InstallTerminalResponse {
    const parsed = RunProjectCommandRequestSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.buildProject(id, parsed.data);
  }

  // ── Project ↔ repo edges (Phase 84 Theme C) ──────────────────────────────
  //
  // Thin as ever: integrity (unknown repo → 404, duplicate → 409, the
  // one-primary invariant) lives in the service.

  @Get(':id/repos')
  listRepos(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): ProjectRepo[] {
    return this.service.listProjectRepos(id, scopeOf(user));
  }

  @Post(':id/repos')
  attachRepo(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): ProjectRepo[] {
    const parsed = AttachProjectRepoRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.attachRepo(id, parsed.data, scopeOf(user));
  }

  @Patch(':id/repos/:repoId')
  setPrimaryRepo(
    @Param('id') id: string,
    @Param('repoId') repoId: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): ProjectRepo[] {
    const parsed = SetProjectRepoPrimaryRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.setPrimaryRepo(id, repoId, parsed.data.isPrimary, scopeOf(user));
  }

  @Delete(':id/repos/:repoId')
  detachRepo(
    @Param('id') id: string,
    @Param('repoId') repoId: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): ProjectRepo[] {
    return this.service.detachRepo(id, repoId, scopeOf(user));
  }

  /** Git status for one attached repo — the per-row probe the Repos panel uses. */
  @Get(':id/repos/:repoId/status')
  repoStatusFor(
    @Param('id') id: string,
    @Param('repoId') repoId: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<RepoStatusResponse> {
    return this.service.getRepoStatusFor(id, repoId, scopeOf(user));
  }

  // Local git status for the project's **effective** work directory — its primary
  // repo since Phase 84 C, else the stored `workDir`. Kept alongside the per-repo
  // route above so existing callers are unaffected. Thin: all fs/child_process
  // work lives in the service.
  @Get(':id/repo-status')
  repoStatus(@Param('id') id: string): Promise<RepoStatusResponse> {
    return this.service.getRepoStatus(id);
  }

  @Post(':id/repo-init')
  initRepo(@Param('id') id: string): Promise<RepoStatusResponse> {
    return this.service.initRepo(id);
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

/** The team scope carried by an authenticated request, or undefined when auth is off. */
function scopeOf(user?: CurrentUserPayload | null) {
  return user ? { userId: user.userId, teamId: user.teamId } : undefined;
}
