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
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { join, resolve, isAbsolute } from 'node:path';
import { mkdirSync, createWriteStream, unlinkSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Inject } from '@nestjs/common';
import {
  AddTaskDependencyRequestSchema,
  AddTaskLinkRequestSchema,
  BulkCreateTaskRequestSchema,
  SetTaskTagsRequestSchema,
  StatusSchema,
  TaskDependencyError,
  UpdateTaskProjectRequestSchema,
  type BulkCreateTaskResponse,
  type CreateTaskResponse,
  type MidniteConfig,
  type Status,
  type Task,
  type TaskCounts,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
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

  // Permanent delete — only valid once the task is archived (the service enforces).
  @Delete(':id')
  remove(@Param('id') id: string): { ok: true } {
    this.service.deleteTask(id);
    return { ok: true };
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
