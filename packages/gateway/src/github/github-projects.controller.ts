import {
  BadGatewayException,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  GITHUB_NOT_CONNECTED_CODE,
  GITHUB_PROJECT_SCOPE_MISSING_CODE,
  LinkGithubProjectItemRequestSchema,
  UpdateGithubProjectMappingRequestSchema,
  type GithubProjectFieldsResponse,
  type GithubProjectItemResponse,
  type GithubProjectsResponse,
  type TeamScope,
} from '@midnite/shared';

import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { TasksRepository } from '../tasks/tasks.repository';
import {
  GithubProjectDoesNotExistError,
  GithubProjectItemDoesNotExistError,
  GithubProjectItemTakenError,
  GithubProjectScopeMissingError,
  GithubProjectsService,
} from './github-projects.service';
import { GithubNotConnectedError } from './github.service';
import { GithubApiError } from './lib/github-rest';

/**
 * Projects v2 discovery and the task ↔ item link (Phase 84 Theme E).
 *
 * Two base paths in one controller because they're one feature: `/github/projects*` is
 * discovery (what boards and columns exist), `/tasks/:taskId/github-project-item` is the
 * link, and the doc names both. Thin as ever — parse, delegate, translate.
 *
 * Gated at `member` throughout, matching the rest of the GitHub surface: every route
 * either reads through an install-wide credential or writes to someone's real board.
 */
@Controller()
export class GithubProjectsController {
  constructor(
    @Inject(GithubProjectsService) private readonly service: GithubProjectsService,
    @Inject(TasksRepository) private readonly tasks: TasksRepository,
  ) {}

  /** Boards the connected account can see — theirs plus their orgs'. */
  @Get('github/projects')
  @RequiresRole('member')
  async listProjects(
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<GithubProjectsResponse> {
    try {
      return { projects: await this.service.listProjects(user?.userId) };
    } catch (err) {
      throw this.translate(err);
    }
  }

  /** A board's single-select fields — the only ones a status can map onto. */
  @Get('github/projects/:projectNodeId/fields')
  @RequiresRole('member')
  async listFields(
    @Param('projectNodeId') projectNodeId: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<GithubProjectFieldsResponse> {
    try {
      return { fields: await this.service.listFields(projectNodeId, user?.userId) };
    } catch (err) {
      throw this.translate(err);
    }
  }

  /** The task's link, if any. 404 when unlinked — the card renders its empty state. */
  @Get('tasks/:taskId/github-project-item')
  @RequiresRole('member')
  getLink(
    @Param('taskId') taskId: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): GithubProjectItemResponse {
    this.requireTask(taskId, scopeOf(user));
    const item = this.service.get(taskId);
    if (!item) throw new NotFoundException(`task ${taskId} is not linked to a GitHub Project item`);
    return { item };
  }

  /**
   * Link the task to a board — creating a draft item from it by default, or adopting an
   * existing item when `itemNodeId` is supplied.
   */
  @Post('tasks/:taskId/github-project-item')
  @RequiresRole('member')
  async link(
    @Param('taskId') taskId: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<GithubProjectItemResponse> {
    const parsed = LinkGithubProjectItemRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'invalid link request');
    }
    const task = this.requireTask(taskId, scopeOf(user));
    try {
      return {
        item: await this.service.link(
          {
            id: task.id,
            title: task.title,
            teamId: task.teamId ?? undefined,
            prompt: task.prompt ?? undefined,
          },
          parsed.data,
          user?.userId,
        ),
      };
    } catch (err) {
      throw this.translate(err);
    }
  }

  /** Replace the status→column mapping. An empty array clears it (pushes become no-ops). */
  @Patch('tasks/:taskId/github-project-item')
  @RequiresRole('member')
  updateMappings(
    @Param('taskId') taskId: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): GithubProjectItemResponse {
    const parsed = UpdateGithubProjectMappingRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'invalid mapping request');
    }
    this.requireTask(taskId, scopeOf(user));
    try {
      return { item: this.service.updateMappings(taskId, parsed.data.mappings) };
    } catch (err) {
      throw this.translate(err);
    }
  }

  /** Re-read the item's real column from GitHub. Display-only — never moves the task. */
  @Post('tasks/:taskId/github-project-item/refresh')
  @RequiresRole('member')
  async refresh(
    @Param('taskId') taskId: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<GithubProjectItemResponse> {
    this.requireTask(taskId, scopeOf(user));
    try {
      return { item: await this.service.refresh(taskId, user?.userId) };
    } catch (err) {
      throw this.translate(err);
    }
  }

  /** Unlink. The GitHub item itself is deliberately left alone (Decision §9). */
  @Delete('tasks/:taskId/github-project-item')
  @RequiresRole('member')
  @HttpCode(204)
  unlink(@Param('taskId') taskId: string, @CurrentUser() user?: CurrentUserPayload | null): void {
    this.requireTask(taskId, scopeOf(user));
    try {
      this.service.unlink(taskId);
    } catch (err) {
      throw this.translate(err);
    }
  }

  /**
   * The task, scoped to the caller.
   *
   * Every route goes through this: a link is a property of the *task*, so whoever can see
   * the task can see and change its link — and someone who cannot see the task must not
   * learn anything about it, including whether it has one.
   */
  private requireTask(taskId: string, scope?: TeamScope) {
    const row = this.tasks.getTask(taskId, scope);
    if (!row) throw new NotFoundException(`task ${taskId} not found`);
    return row;
  }

  /** Domain error → HTTP, with machine-readable codes where the remedy differs. */
  private translate(err: unknown): Error {
    if (err instanceof GithubNotConnectedError) {
      return new ConflictException({
        statusCode: 409,
        code: GITHUB_NOT_CONNECTED_CODE,
        message: err.message,
      });
    }
    if (err instanceof GithubProjectScopeMissingError) {
      // 403 with its own code: the token is valid, it simply can't reach Projects. The
      // remedy is "reconnect to grant `project`", which is neither a retry nor a login.
      return new ForbiddenException({
        statusCode: 403,
        code: GITHUB_PROJECT_SCOPE_MISSING_CODE,
        message: err.message,
      });
    }
    if (err instanceof GithubProjectItemTakenError) return new ConflictException(err.message);
    if (err instanceof GithubProjectItemDoesNotExistError) return new NotFoundException(err.message);
    if (err instanceof GithubProjectDoesNotExistError) return new NotFoundException(err.message);
    // An upstream GitHub failure is not our bug; 500 would claim it was.
    if (err instanceof GithubApiError) return new BadGatewayException(err.message);
    return err instanceof Error ? err : new Error(String(err));
  }
}

function scopeOf(user?: CurrentUserPayload | null): TeamScope | undefined {
  return user ? { userId: user.userId, teamId: user.teamId } : undefined;
}
