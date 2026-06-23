import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { join, resolve, isAbsolute } from 'node:path';
import { mkdirSync, createWriteStream, unlinkSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Inject } from '@nestjs/common';
import {
  AddTaskDependencyRequestSchema,
  AddTaskLinkRequestSchema,
  BreakdownGoalRequestSchema,
  BulkCreateTaskRequestSchema,
  CreateFromBreakdownRequestSchema,
  ReportFormatSchema,
  SetTaskTagsRequestSchema,
  StatusSchema,
  TaskDependencyError,
  UpdateTaskProjectRequestSchema,
  isServerRenderedReportFormat,
  type BreakdownPreviewResponse,
  type BulkCreateTaskResponse,
  type CheckRunListResponse,
  type CreateFromBreakdownResponse,
  type CreateTaskResponse,
  type MidniteConfig,
  type Status,
  type Task,
  type TaskCounts,
  type TriggerCheckResponse,
} from '@midnite/shared';
import { BreakdownService } from '../agent/breakdown.service';
import { MIDNITE_CONFIG } from '../config.token';
import { sendMarkdownReport } from '../lib/report-response';
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
    @Inject(BreakdownService) private readonly breakdown: BreakdownService,
  ) {}

  @Get('counts')
  counts(): TaskCounts {
    return this.service.getCounts();
  }

  @Get()
  list(
    @Query('status') statusRaw?: string,
    @Query('projectId') projectId?: string,
  ): Task[] {
    let status: Status | undefined;
    if (statusRaw) {
      const parsed = StatusSchema.safeParse(statusRaw);
      if (!parsed.success) {
        throw new BadRequestException(`invalid status: ${statusRaw}`);
      }
      status = parsed.data;
    }
    return this.service.listTasks(status, projectId?.trim() || undefined);
  }

  @Get(':id')
  get(@Param('id') id: string): Task {
    return this.service.getTask(id);
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

  @Patch(':id/project')
  updateProject(@Param('id') id: string, @Body() body: unknown): Task {
    const parsed = UpdateTaskProjectRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    return this.service.setProject(id, parsed.data.projectId);
  }

  @Patch(':id/tags')
  updateTags(@Param('id') id: string, @Body() body: unknown): Task {
    const parsed = SetTaskTagsRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    return this.service.setTags(id, parsed.data.tags);
  }

  @Post(':id/links')
  addLink(@Param('id') id: string, @Body() body: unknown): Task {
    const parsed = AddTaskLinkRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    return this.service.addLink(id, parsed.data.url, parsed.data.label);
  }

  @Delete(':id/links/:linkId')
  removeLink(@Param('id') id: string, @Param('linkId') linkId: string): Task {
    return this.service.removeLink(id, linkId);
  }

  // On-demand refresh of the task's GitHub PR status (Phase 22 Theme C). Returns
  // the re-hydrated task; a missing task 404s, a task without a parseable PR URL
  // is a no-op. Thin: the service owns the gh-first/REST fetch + persistence.
  @Post(':id/pr/refresh')
  async refreshPr(@Param('id') id: string): Promise<Task> {
    return this.prStatus.refresh(id);
  }

  // Add a blocker edge. A self-reference / unknown blocker → 400; a cycle → 409.
  // A missing :id task surfaces as the service's 404.
  @Post(':id/dependencies')
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
  remove(@Param('id') id: string): { ok: true } {
    this.service.deleteTask(id);
    return { ok: true };
  }

  // Standalone breakdown (Phase 28 Theme D): generate a structured, dependency-
  // aware task list from a freeform goal. Preview-only step — the client edits
  // and confirms, then calls POST /tasks/breakdown/create to materialise the board.
  @Post('breakdown')
  async draftBreakdown(@Body() body: unknown): Promise<BreakdownPreviewResponse> {
    const parsed = BreakdownGoalRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.breakdown.generate({ goal: parsed.data.goal, isProject: false });
  }

  // Create-from-breakdown (standalone path, Theme D): turn a confirmed/edited
  // Breakdown into a dependency-wired board without a project. Mirrors
  // POST /projects/:id/plan/create-from-breakdown but scoped to tasks only.
  @Post('breakdown/create')
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
  async create(@Req() req: FastifyRequest): Promise<CreateTaskResponse> {
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
