import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  Post,
  Query,
} from '@nestjs/common';

import {
  GITHUB_NOT_CONNECTED_CODE,
  ImportGithubRepoRequestSchema,
  type GithubConnectionResponse,
  type GithubReposResponse,
  type ImportGithubRepoResponse,
} from '@midnite/shared';

import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { RepoNameTakenError } from '../repos/repos.service';
import {
  GithubNotConnectedError,
  GithubRepoNotCheckedOutError,
  GithubService,
} from './github.service';

/**
 * Repo discovery over the connected GitHub account (Phase 84 Theme B). Thin by the
 * gateway layering rule: parse, delegate, translate domain errors to status codes.
 *
 * `web` never talks to api.github.com and never sees a token — that is the whole point
 * of proxying here rather than handing the browser a credential.
 */
@Controller('github')
export class GithubController {
  constructor(@Inject(GithubService) private readonly service: GithubService) {}

  /** Connection state for the Settings card. Always 200 — "not connected" is an answer. */
  @Get('connection')
  async connection(
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<GithubConnectionResponse> {
    return { connection: await this.service.getConnection(user?.userId) };
  }

  /**
   * The user's repositories, annotated against local checkouts and the repo registry.
   * `?refresh=1` bypasses the short-TTL cache for an explicit "refresh" click.
   */
  @Get('repos')
  async repos(
    @Query('refresh') refresh?: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<GithubReposResponse> {
    try {
      return await this.service.listRepos(user?.userId, { refresh: isTruthy(refresh) });
    } catch (err) {
      throw this.translate(err);
    }
  }

  /** Import a browsed repo into the registry. Same role gate as `POST /repos`. */
  @Post('repos/import')
  @RequiresRole('member')
  async import(
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<ImportGithubRepoResponse> {
    const parsed = ImportGithubRepoRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'invalid import request');
    }
    try {
      return { repo: await this.service.importRepo(parsed.data, user?.userId) };
    } catch (err) {
      throw this.translate(err);
    }
  }

  /**
   * Domain error → HTTP. The "not connected" 409 carries a machine-readable `code` so
   * the client can render a connect prompt rather than string-matching a message.
   */
  private translate(err: unknown): Error {
    if (err instanceof GithubNotConnectedError) {
      return new ConflictException({
        statusCode: 409,
        code: GITHUB_NOT_CONNECTED_CODE,
        message: err.message,
      });
    }
    if (err instanceof GithubRepoNotCheckedOutError) return new BadRequestException(err.message);
    if (err instanceof RepoNameTakenError) return new ConflictException(err.message);
    return err instanceof Error ? err : new Error(String(err));
  }
}

function isTruthy(value?: string): boolean {
  return value === '1' || value === 'true';
}
