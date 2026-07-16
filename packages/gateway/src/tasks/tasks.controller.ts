import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { join, resolve, isAbsolute } from 'node:path';
import { mkdirSync, createWriteStream, unlinkSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Inject } from '@nestjs/common';
import {
  AddTaskDependencyRequestSchema,
  PrReviewSubmissionSchema,
  PrMergeRequestSchema,
  CreatePrReviewDraftSchema,
  UpdatePrReviewDraftSchema,
  type PrReviewDraft,
  type PrReviewDraftsResponse,
  AddTaskLinkRequestSchema,
  BreakdownGoalRequestSchema,
  BulkCreateTaskRequestSchema,
  CreateFromBreakdownRequestSchema,
  ReportFormatSchema,
  ResolveTaskRequestSchema,
  TaskFailuresQuerySchema,
  SetTaskPriorityRequestSchema,
  SetTaskTagsRequestSchema,
  StatusSchema,
  TaskListQuerySchema,
  TaskDependencyError,
  UpdateTaskProjectRequestSchema,
  isServerRenderedReportFormat,
  type BreakdownPreviewResponse,
  type BulkCreateTaskResponse,
  type CheckRunListResponse,
  type CreateFromBreakdownResponse,
  type CreateTaskResponse,
  type MidniteConfig,
  type PrDiff,
  type Status,
  type Task,
  type TaskActivityEntry,
  type TaskCounts,
  type TasksPage,
  type TaskGraphResponse,
  type TaskFailuresResponse,
  type TriggerCheckResponse,
} from '@midnite/shared';
import { BreakdownService } from '../agent/breakdown.service';
import { MIDNITE_CONFIG } from '../config.token';
import { sendMarkdownReport } from '../lib/report-response';
import { PrDiffService } from './pr-diff.service';
import { PrReviewService } from './pr-review.service';
import { PrStatusService } from './pr-status.service';
import { TasksService } from './tasks.service';

const IMAGE_MIME_ALLOWLIST = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

@Controller('tasks')
export class TasksController {
  constructor(
    @Inject(TasksService) private readonly service: TasksService,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(PrStatusService) private readonly prStatus: PrStatusService,
    @Inject(PrDiffService) private readonly prDiff: PrDiffService,
    @Inject(PrReviewService) private readonly prReview: PrReviewService,
    @Inject(BreakdownService) private readonly breakdown: BreakdownService,
  ) {}

  @Get('counts')
  counts(): TaskCounts {
    return this.service.getCounts();
  }

  // Phase 58 A — the dependency graph (nodes + edges, ready/blocked computed with
  // the scheduler's readiness logic). Static route, declared before `@Get(':id')`.
  @Get('graph')
  graph(
    @Query('projectId') projectId?: string,
    @Query('milestoneId') milestoneId?: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): TaskGraphResponse {
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return {
      graph: this.service.buildGraph(projectId?.trim() || undefined, scope, milestoneId?.trim() || undefined),
    };
  }

  /**
   * Board list (Phase 57 C) — returns lean `TaskSummary` **pages** (`{ items,
   * total }`), not the full `Task[]`. `page`/`limit` are optional; omitted =
   * every matching task (the board loads all columns). The full task shape stays
   * on the detail route (`GET /tasks/:id`).
   */
  @Get()
  list(
    @Query() rawQuery: Record<string, string>,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): TasksPage {
    const parsed = TaskListQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'invalid task query');
    }
    const { status, projectId, page, limit } = parsed.data;
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.service.listTaskSummaries(status, projectId?.trim() || undefined, scope, {
      page,
      limit,
    });
  }

  /** Recent failures across tasks (Phase 53 E). Static route — declared before
   *  `:id` so it isn't shadowed by the param route. */
  @Get('failures')
  listRecentFailures(
    @Query() query: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): TaskFailuresResponse {
    const parsed = TaskFailuresQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return { failures: this.service.listRecentFailures(parsed.data, scope) };
  }

  /** Recent cross-task activity feed (Phase 57 C). Static route before `:id`.
   *  Replaces the dashboard hydrating every task's events client-side. */
  @Get('activity')
  activity(
    @Query('limit') limitRaw?: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): TaskActivityEntry[] {
    const limit = limitRaw ? Number(limitRaw) : undefined;
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.service.recentActivity(scope, Number.isFinite(limit) ? limit : undefined);
  }

  @Get(':id/failures')
  listTaskFailures(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): TaskFailuresResponse {
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    this.service.getTask(id, scope); // 404s if the task isn't visible in scope
    return { failures: this.service.listFailures(id) };
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user?: CurrentUserPayload | null): Task {
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.service.getTask(id, scope);
  }

  // Export the task thread as a portable markdown document. `pdf` is rendered
  // client-side from this markdown (print-to-PDF), so only `md` is served here.
  @Get(':id/export')
  exportTask(
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
    sendMarkdownReport(reply, filename, markdown);
  }

  @Patch(':id/status')
  @RequiresRole('member')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status?: string },
  ): Task {
    const parsed = StatusSchema.safeParse(body?.status);
    if (!parsed.success) {
      throw new BadRequestException(`invalid status`);
    }
    return this.service.updateStatus(id, parsed.data);
  }

  /** Resolve a needs-attention task (Phase 53 D): requeue / re-plan / abandon. */
  @Post(':id/resolve')
  @RequiresRole('member')
  resolve(@Param('id') id: string, @Body() body: unknown): Task {
    const parsed = ResolveTaskRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    return this.service.resolveNeedsAttention(id, parsed.data.action, parsed.data.prompt);
  }

  /** Reopen a terminal task (Phase 69 E): `done`/`abandoned` → `todo`, clearing
   *  bindings + retry state and re-blocking dependents. A dedicated verb, not a
   *  status PATCH — `ALLOWED_TRANSITIONS` stays strict. Same actor role as abandon. */
  @Post(':id/reopen')
  @RequiresRole('member')
  reopen(@Param('id') id: string): Task {
    return this.service.reopen(id);
  }

  @Patch(':id/project')
  @RequiresRole('member')
  updateProject(@Param('id') id: string, @Body() body: unknown): Task {
    const parsed = UpdateTaskProjectRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    return this.service.setProject(id, parsed.data.projectId);
  }

  @Patch(':id/tags')
  @RequiresRole('member')
  updateTags(@Param('id') id: string, @Body() body: unknown): Task {
    const parsed = SetTaskTagsRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    return this.service.setTags(id, parsed.data.tags);
  }

  @Patch(':id/priority')
  @RequiresRole('member')
  updatePriority(@Param('id') id: string, @Body() body: unknown): Task {
    const parsed = SetTaskPriorityRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    return this.service.setPriority(id, parsed.data.priority);
  }

  @Post(':id/links')
  @RequiresRole('member')
  addLink(@Param('id') id: string, @Body() body: unknown): Task {
    const parsed = AddTaskLinkRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    return this.service.addLink(id, parsed.data.url, parsed.data.label);
  }

  @Delete(':id/links/:linkId')
  @RequiresRole('member')
  removeLink(@Param('id') id: string, @Param('linkId') linkId: string): Task {
    return this.service.removeLink(id, linkId);
  }

  // On-demand refresh of the task's GitHub PR status (Phase 22 Theme C). Returns
  // the re-hydrated task; a missing task 404s, a task without a parseable PR URL
  // is a no-op. Thin: the service owns the gh-first/REST fetch + persistence.
  @Post(':id/pr/refresh')
  @RequiresRole('member')
  async refreshPr(@Param('id') id: string): Promise<Task> {
    return this.prStatus.refresh(id);
  }

  // Structured diff for the task's GitHub PR (Phase 52 Theme A). Read-only, so no
  // RBAC beyond the ambient guard (mirrors `GET :id`). A missing task / no-PR 404s;
  // a fetch failure fails open as a 503 (the web shows a retry banner), never 500.
  @Get(':id/pr/diff')
  async prDiffForTask(@Param('id') id: string): Promise<PrDiff> {
    return this.prDiff.getDiffForTask(id);
  }

  // Submit a review (approve / request-changes / comment + optional inline
  // comments) on the task's PR (Phase 52 Theme C). Member+; audited. A GitHub
  // refusal surfaces as a 502 (the service maps it), a no-PR task 404s. Returns
  // the re-hydrated task with a refreshed pr_status (reviewDecision).
  @Post(':id/pr/review')
  @RequiresRole('member')
  async submitPrReview(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<Task> {
    const parsed = PrReviewSubmissionSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.prReview.submitReview(id, parsed.data, user?.userId ?? 'local');
  }

  // Inline review comment drafts (Phase 52 D). Per-author, persist immediately so
  // a review-in-progress survives a reload; batched into the review on submit.
  @Get(':id/pr/review/comments')
  @RequiresRole('member')
  listPrDrafts(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): PrReviewDraftsResponse {
    return { drafts: this.prReview.listDrafts(id, user?.userId ?? 'local') };
  }

  @Post(':id/pr/review/comments')
  @RequiresRole('member')
  createPrDraft(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): PrReviewDraft {
    const parsed = CreatePrReviewDraftSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.prReview.createDraft(id, parsed.data, user?.userId ?? 'local');
  }

  @Patch(':id/pr/review/comments/:commentId')
  @RequiresRole('member')
  updatePrDraft(
    @Param('commentId') commentId: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): PrReviewDraft {
    const parsed = UpdatePrReviewDraftSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.prReview.updateDraft(commentId, parsed.data.body, user?.userId ?? 'local');
  }

  @Delete(':id/pr/review/comments/:commentId')
  @RequiresRole('member')
  @HttpCode(204)
  deletePrDraft(
    @Param('commentId') commentId: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): void {
    this.prReview.deleteDraft(commentId, user?.userId ?? 'local');
  }

  // Merge the task's PR (Phase 52 Theme C). Member+; audited. Honors mergeability
  // + branch protection (a refusal surfaces as a 502, never forced). Returns the
  // re-hydrated task with a refreshed pr_status (merged state).
  @Post(':id/pr/merge')
  @RequiresRole('member')
  async mergePr(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<Task> {
    const parsed = PrMergeRequestSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.prReview.mergePr(id, parsed.data.method, user?.userId ?? null);
  }

  // Add a blocker edge. A self-reference / unknown blocker → 400; a cycle → 409.
  // A missing :id task surfaces as the service's 404.
  @Post(':id/dependencies')
  @RequiresRole('member')
  addDependency(@Param('id') id: string, @Body() body: unknown): Task {
    const parsed = AddTaskDependencyRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    try {
      return this.service.addDependency(id, parsed.data.dependsOnId);
    } catch (err) {
      if (err instanceof TaskDependencyError) {
        throw err.reason === 'cycle'
          ? new ConflictException(err.message)
          : new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Delete(':id/dependencies/:dependsOnId')
  @RequiresRole('member')
  removeDependency(
    @Param('id') id: string,
    @Param('dependsOnId') dependsOnId: string,
  ): Task {
    return this.service.removeDependency(id, dependsOnId);
  }

  // Trigger a manual check run for a task (Phase 30 Theme D). Returns a no-op
  // stub when the gate is disabled / no repo / no checks configured. Thin: the
  // service owns the run/save/event logic (mirrors the gate path in the runner).
  @Post(':id/check')
  @RequiresRole('member')
  async triggerCheck(@Param('id') id: string): Promise<TriggerCheckResponse> {
    const run = await this.service.runManualCheck(id);
    return { run };
  }

  // Return all check runs for a task, oldest-first. Thin: no pagination yet.
  @Get(':id/check-runs')
  listCheckRuns(@Param('id') id: string): CheckRunListResponse {
    const runs = this.service.getCheckRuns(id);
    return { runs };
  }

  // Permanent delete — only valid once the task is archived (the service enforces).
  @Delete(':id')
  @RequiresRole('admin')
  remove(@Param('id') id: string): { ok: true } {
    this.service.deleteTask(id);
    return { ok: true };
  }

  // Standalone breakdown (Phase 28 Theme D): generate a structured, dependency-
  // aware task list from a freeform goal. Preview-only step — the client edits
  // and confirms, then calls POST /tasks/breakdown/create to materialise the board.
  @Post('breakdown')
  @RequiresRole('member')
  async draftBreakdown(@Body() body: unknown): Promise<BreakdownPreviewResponse> {
    const parsed = BreakdownGoalRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.breakdown.generate({ goal: parsed.data.goal, isProject: false });
  }

  // Create-from-breakdown (standalone path, Theme D): turn a confirmed/edited
  // Breakdown into a dependency-wired board without a project. Mirrors
  // POST /projects/:id/plan/create-from-breakdown but scoped to tasks only.
  @Post('breakdown/create')
  @RequiresRole('member')
  createFromBreakdown(@Body() body: unknown): CreateFromBreakdownResponse {
    const parsed = CreateFromBreakdownRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return {
      tasks: this.service.createTasksFromBreakdown(parsed.data.breakdown, {
        repo: parsed.data.repo,
      }),
    };
  }

  // Bulk create from a pasted blob (JSON, no attachments). Thin: validate the
  // batch body, delegate to the service, which fans each line through the normal
  // create pipeline and coalesces the board broadcast.
  @Post('bulk')
  @RequiresRole('member')
  async createBulk(@Body() body: unknown): Promise<BulkCreateTaskResponse> {
    const parsed = BulkCreateTaskRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    const { raw, lines, repo, projectId, priority } = parsed.data;
    return this.service.createBulk({
      raw,
      lines,
      repo: repo?.trim() || undefined,
      projectId: projectId?.trim() || undefined,
      priority,
    });
  }

  @Post()
  @RequiresRole('member')
  async create(
    @Req() req: FastifyRequest,
    @CurrentUser() user: CurrentUserPayload | null,
  ): Promise<CreateTaskResponse> {
    if (!req.isMultipart()) {
      throw new BadRequestException('expected multipart/form-data');
    }

    const uploadsRoot = this.resolveUploadsDir();
    const stagingId = randomUUID();
    const stagingDir = join(uploadsRoot, stagingId);
    mkdirSync(stagingDir, { recursive: true });

    let prompt = '';
    let repo: string | undefined;
    let projectId: string | undefined;
    let status: Status | undefined;
    let priority: number | undefined;
    // Repeatable `dependsOn` form fields → blocker ids (Phase 27).
    const dependsOn: string[] = [];
    const savedFiles: Array<{
      path: string;
      relPath: string;
      mime: string;
      size: number;
      originalName?: string;
    }> = [];

    try {
      for await (const part of req.parts()) {
        if (part.type === 'file') {
          if (!IMAGE_MIME_ALLOWLIST.has(part.mimetype)) {
            // skip non-image files silently for now
            await part.toBuffer();
            continue;
          }
          const safeName = `${randomUUID()}-${sanitizeName(part.filename)}`;
          const absPath = join(stagingDir, safeName);
          const ws = createWriteStream(absPath);
          await pipeline(part.file, ws);
          const size = (await import('node:fs')).statSync(absPath).size;
          savedFiles.push({
            path: absPath,
            relPath: join(stagingId, safeName),
            mime: part.mimetype,
            size,
            originalName: part.filename,
          });
        } else {
          if (part.fieldname === 'prompt') prompt = String(part.value ?? '');
          if (part.fieldname === 'repo') repo = String(part.value ?? '');
          if (part.fieldname === 'projectId') projectId = String(part.value ?? '');
          if (part.fieldname === 'dependsOn') {
            const id = String(part.value ?? '').trim();
            if (id) dependsOn.push(id);
          }
          if (part.fieldname === 'priority') {
            const n = Number(part.value);
            if (!Number.isInteger(n) || n < 0 || n > 3) {
              throw new BadRequestException(`invalid priority: ${String(part.value)}`);
            }
            priority = n;
          }
          if (part.fieldname === 'status') {
            const parsed = StatusSchema.safeParse(String(part.value ?? ''));
            if (!parsed.success) {
              throw new BadRequestException(`invalid status: ${String(part.value)}`);
            }
            status = parsed.data;
          }
        }
      }

      if (!prompt.trim()) {
        throw new BadRequestException('prompt is required');
      }

      const task = await this.service.createFromPrompt({
        prompt: prompt.trim(),
        repo: repo?.trim() || undefined,
        projectId: projectId?.trim() || undefined,
        status,
        priority,
        dependsOn: dependsOn.length > 0 ? dependsOn : undefined,
        images: savedFiles.map((f) => ({
          path: f.relPath,
          mime: f.mime,
          size: f.size,
          originalName: f.originalName,
        })),
        createdBy: user?.userId,
      });

      return { task };
    } catch (err) {
      for (const f of savedFiles) {
        if (existsSync(f.path)) {
          try { unlinkSync(f.path); } catch {}
        }
      }
      // A bad `dependsOn` blocker (unknown id) on create surfaces as a clean 4xx
      // rather than a 500 — mirrors the addDependency route. A brand-new task has
      // no dependents, so 'cycle' isn't reachable here, but map it for parity.
      if (err instanceof TaskDependencyError) {
        throw err.reason === 'cycle'
          ? new ConflictException(err.message)
          : new BadRequestException(err.message);
      }
      throw err;
    }
  }

  private resolveUploadsDir(): string {
    const p = this.config.gateway.uploadsDir;
    return isAbsolute(p) ? p : resolve(process.cwd(), p);
  }
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}
