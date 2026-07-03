import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateRepoRequestSchema,
  UpdateRepoRequestSchema,
  type Repo,
  type RepoResponse,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { RepoDoesNotExistError, RepoNameTakenError, ReposService } from './repos.service';

@Controller('repos')
export class ReposController {
  constructor(@Inject(ReposService) private readonly service: ReposService) {}

  @Get()
  list(@CurrentUser() user?: CurrentUserPayload | null): Repo[] {
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.service.list(scope);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user?: CurrentUserPayload | null): Repo {
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.translate(() => this.service.get(id, scope));
  }

  @Post()
  @RequiresRole('member')
  create(
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload | null,
  ): RepoResponse {
    const parsed = CreateRepoRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { repo: this.translate(() => this.service.create(parsed.data, user?.userId)) };
  }

  @Patch(':id')
  @RequiresRole('admin')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): RepoResponse {
    const parsed = UpdateRepoRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { repo: this.translate(() => this.service.update(id, parsed.data, user?.userId ?? null)) };
  }

  @Delete(':id')
  @RequiresRole('admin')
  remove(@Param('id') id: string, @CurrentUser() user?: CurrentUserPayload | null): { ok: true } {
    this.translate(() => this.service.delete(id, user?.userId ?? null));
    return { ok: true };
  }

  // Domain errors → HTTP: unknown id → 404, duplicate name → 409.
  private translate<T>(fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      if (err instanceof RepoDoesNotExistError) throw new NotFoundException(err.message);
      if (err instanceof RepoNameTakenError) throw new ConflictException(err.message);
      throw err;
    }
  }
}
