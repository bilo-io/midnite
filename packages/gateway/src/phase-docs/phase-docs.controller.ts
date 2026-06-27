import {
  BadGatewayException,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CreateFromBreakdownRequestSchema,
  CreatePhaseDocRequestSchema,
  UpdatePhaseDocRequestSchema,
  type BreakdownPreviewResponse,
  type BreakdownTask,
  type CreateFromBreakdownResponse,
  type PhaseDoc,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { BreakdownService } from '../agent/breakdown.service';
import { ProjectsService } from '../projects/projects.service';
import { ReposService } from '../repos/repos.service';
import { TasksService } from '../tasks/tasks.service';
import {
  GithubUnavailableError,
  PhaseDocConflictError,
  PhaseDocNotFoundError,
  PhaseDocsService,
} from './phase-docs.service';

const DEFAULT_SCOPE = { userId: 'anonymous', teamId: null };

function toScope(user: CurrentUserPayload | null | undefined) {
  return user ? { userId: user.userId, teamId: user.teamId } : DEFAULT_SCOPE;
}

/**
 * Reject anything but a plain `<slug>.md` basename — the filename is interpolated
 * into the GitHub Contents API path, so a `/` or `..` could escape `.midnite/phases/`.
 */
function assertSafeFilename(filename: string): void {
  if (!/^[A-Za-z0-9._-]+\.md$/.test(filename) || filename.includes('..')) {
    throw new BadRequestException('invalid phase doc filename');
  }
}

/**
 * Phase-doc CRUD scoped to a project. The project's GitHub target isn't stored on
 * the project (decision: explicit repo pick in the UI) — the caller passes `repoId`
 * and we resolve its `ownerRepo` slug here via {@link ReposService}. Thin: decode →
 * service → map GitHub failures to HTTP status.
 */
@Controller('projects/:id/phase-docs')
export class PhaseDocsController {
  constructor(
    private readonly service: PhaseDocsService,
    private readonly projects: ProjectsService,
    private readonly repos: ReposService,
    private readonly breakdown: BreakdownService,
    private readonly tasks: TasksService,
  ) {}

  @Get()
  async list(
    @Param('id') projectId: string,
    @Query('repoId') repoId: string | undefined,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<{ docs: PhaseDoc[] }> {
    const ownerRepo = this.resolveOwnerRepo(projectId, repoId, user);
    return this.guard(async () => ({ docs: await this.service.list(ownerRepo) }));
  }

  @Get(':filename')
  async get(
    @Param('id') projectId: string,
    @Param('filename') filename: string,
    @Query('repoId') repoId: string | undefined,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<{ doc: PhaseDoc }> {
    assertSafeFilename(filename);
    const ownerRepo = this.resolveOwnerRepo(projectId, repoId, user);
    return this.guard(async () => ({ doc: await this.service.get(ownerRepo, filename) }));
  }

  @Post()
  @RequiresRole('member')
  async create(
    @Param('id') projectId: string,
    @Query('repoId') repoId: string | undefined,
    @Body() rawBody: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<{ doc: PhaseDoc }> {
    const ownerRepo = this.resolveOwnerRepo(projectId, repoId, user);
    const parsed = CreatePhaseDocRequestSchema.safeParse(rawBody);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.guard(async () => ({
      doc: await this.service.create(ownerRepo, parsed.data.name, parsed.data.content),
    }));
  }

  @Put(':filename')
  @RequiresRole('member')
  async update(
    @Param('id') projectId: string,
    @Param('filename') filename: string,
    @Query('repoId') repoId: string | undefined,
    @Body() rawBody: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<{ doc: PhaseDoc }> {
    assertSafeFilename(filename);
    const ownerRepo = this.resolveOwnerRepo(projectId, repoId, user);
    const parsed = UpdatePhaseDocRequestSchema.safeParse(rawBody);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.guard(async () => ({
      doc: await this.service.update(ownerRepo, filename, parsed.data.content, parsed.data.sha),
    }));
  }

  @Delete(':filename')
  @HttpCode(204)
  @RequiresRole('member')
  async remove(
    @Param('id') projectId: string,
    @Param('filename') filename: string,
    @Query('repoId') repoId: string | undefined,
    @Query('sha') sha: string | undefined,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<void> {
    assertSafeFilename(filename);
    const ownerRepo = this.resolveOwnerRepo(projectId, repoId, user);
    if (!sha) throw new BadRequestException('sha query param is required to delete a phase doc');
    await this.guard(() => this.service.delete(ownerRepo, filename, sha));
  }

  /**
   * Preview the tasks a phase doc would seed (Theme D). Fetches the doc and parses
   * it into a dependency-aware breakdown with stable anchors — **creates nothing**;
   * the client edits and confirms via {@link seedTasks}.
   */
  @Post(':filename/seed')
  @RequiresRole('member')
  async seedPreview(
    @Param('id') projectId: string,
    @Param('filename') filename: string,
    @Query('repoId') repoId: string | undefined,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<BreakdownPreviewResponse> {
    assertSafeFilename(filename);
    const ownerRepo = this.resolveOwnerRepo(projectId, repoId, user);
    const doc = await this.guard(() => this.service.get(ownerRepo, filename));
    return this.breakdown.parseDoc(doc.content);
  }

  /**
   * Create the (edited) breakdown as project-linked, edge-wired tasks, tagging each
   * with `phase-doc:<filename>` + `phase-item:<anchor>` so Theme E can sync ticks
   * back to the `.md`.
   */
  @Post(':filename/seed-tasks')
  @RequiresRole('member')
  seedTasks(
    @Param('id') projectId: string,
    @Param('filename') filename: string,
    @Body() rawBody: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): CreateFromBreakdownResponse {
    assertSafeFilename(filename);
    // Validate the project is real / in scope (404s otherwise) — no repo needed here.
    this.projects.getProject(projectId, toScope(user));
    const parsed = CreateFromBreakdownRequestSchema.safeParse(rawBody);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const tasks = this.tasks.createTasksFromBreakdown(parsed.data.breakdown, {
      projectId,
      repo: parsed.data.repo,
      tagsFor: (task: BreakdownTask) =>
        task.anchor ? [`phase-doc:${filename}`, `phase-item:${task.anchor}`] : [`phase-doc:${filename}`],
    });
    return { tasks };
  }

  /**
   * Validate the project exists, resolve the picked repo, and return its
   * `owner/repo` slug. Throws 400 when `repoId` is missing and 404 when the repo
   * has no GitHub slug configured.
   */
  private resolveOwnerRepo(
    projectId: string,
    repoId: string | undefined,
    user: CurrentUserPayload | null | undefined,
  ): string {
    const scope = toScope(user);
    // Throws NotFoundException (404) when the project doesn't exist / isn't in scope.
    this.projects.getProject(projectId, scope);
    if (!repoId) throw new BadRequestException('repoId query param is required');
    const repo = this.repos.get(repoId, scope);
    if (!repo.ownerRepo) {
      throw new NotFoundException(
        `repo "${repo.name}" has no GitHub owner/repo configured — set it to author phase docs`,
      );
    }
    return repo.ownerRepo;
  }

  /** Run a GitHub-backed op, translating domain errors to HTTP status codes. */
  private async guard<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof PhaseDocConflictError) throw new ConflictException(err.message);
      if (err instanceof PhaseDocNotFoundError) throw new NotFoundException('phase doc not found');
      if (err instanceof GithubUnavailableError) throw new BadGatewayException(err.message);
      throw err;
    }
  }
}
