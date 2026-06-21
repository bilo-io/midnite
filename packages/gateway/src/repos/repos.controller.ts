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
import { RepoDoesNotExistError, RepoNameTakenError, ReposService } from './repos.service';

@Controller('repos')
export class ReposController {
  constructor(@Inject(ReposService) private readonly service: ReposService) {}

  @Get()
  list(): Repo[] {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id') id: string): Repo {
    return this.translate(() => this.service.get(id));
  }

  @Post()
  create(@Body() body: unknown): RepoResponse {
    const parsed = CreateRepoRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { repo: this.translate(() => this.service.create(parsed.data)) };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown): RepoResponse {
    const parsed = UpdateRepoRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { repo: this.translate(() => this.service.update(id, parsed.data)) };
  }

  @Delete(':id')
  remove(@Param('id') id: string): { ok: true } {
    this.translate(() => this.service.delete(id));
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
