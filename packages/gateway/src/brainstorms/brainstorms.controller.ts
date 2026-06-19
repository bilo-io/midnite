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
  CreateBrainstormContributorRequestSchema,
  CreateBrainstormRequestSchema,
  ReorderBrainstormContributorsRequestSchema,
  RetryBrainstormSynthesisRequestSchema,
  StartBrainstormRunRequestSchema,
  UpdateBrainstormContributorRequestSchema,
  UpdateBrainstormRequestSchema,
  type Brainstorm,
  type BrainstormContributorResponse,
  type BrainstormResponse,
  type BrainstormRunResponse,
  type BrainstormRunsResponse,
} from '@midnite/shared';
import {
  BrainstormContributorNotLiveError,
  BrainstormEmptyError,
  BrainstormRunInProgressError,
  BrainstormRunNotRetryableError,
  BrainstormRunnerService,
} from './brainstorm-runner.service';
import {
  BrainstormContributorDoesNotExistError,
  BrainstormDoesNotExistError,
  BrainstormsService,
} from './brainstorms.service';
import { BrainstormsRepository } from './brainstorms.repository';

@Controller('brainstorms')
export class BrainstormsController {
  constructor(
    @Inject(BrainstormsService) private readonly service: BrainstormsService,
    @Inject(BrainstormRunnerService) private readonly runner: BrainstormRunnerService,
    @Inject(BrainstormsRepository) private readonly repo: BrainstormsRepository,
  ) {}

  @Get()
  list(): Brainstorm[] {
    return this.service.listBrainstorms();
  }

  @Post()
  create(@Body() body: unknown): BrainstormResponse {
    const parsed = CreateBrainstormRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { brainstorm: this.service.createBrainstorm(parsed.data) };
  }

  @Get(':id')
  get(@Param('id') id: string): BrainstormResponse {
    return { brainstorm: this.translate(() => this.service.getBrainstorm(id)) };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown): BrainstormResponse {
    const parsed = UpdateBrainstormRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { brainstorm: this.translate(() => this.service.updateBrainstorm(id, parsed.data)) };
  }

  @Delete(':id')
  remove(@Param('id') id: string): { ok: true } {
    this.translate(() => this.service.deleteBrainstorm(id));
    return { ok: true };
  }

  @Post(':id/contributors')
  createContributor(@Param('id') id: string, @Body() body: unknown): BrainstormContributorResponse {
    const parsed = CreateBrainstormContributorRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { contributor: this.translate(() => this.service.createContributor(id, parsed.data)) };
  }

  // Static segment, so it never collides with `:contributorId` below.
  @Post(':id/contributors/reorder')
  reorderContributors(@Param('id') id: string, @Body() body: unknown): BrainstormResponse {
    const parsed = ReorderBrainstormContributorsRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return {
      brainstorm: this.translate(() =>
        this.service.reorderContributors(id, parsed.data.contributorIds),
      ),
    };
  }

  @Patch(':id/contributors/:contributorId')
  updateContributor(
    @Param('id') id: string,
    @Param('contributorId') contributorId: string,
    @Body() body: unknown,
  ): BrainstormContributorResponse {
    const parsed = UpdateBrainstormContributorRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return {
      contributor: this.translate(() =>
        this.service.updateContributor(id, contributorId, parsed.data),
      ),
    };
  }

  @Delete(':id/contributors/:contributorId')
  removeContributor(
    @Param('id') id: string,
    @Param('contributorId') contributorId: string,
  ): { ok: true } {
    this.translate(() => this.service.deleteContributor(id, contributorId));
    return { ok: true };
  }

  @Post(':id/runs')
  startRun(@Param('id') id: string, @Body() body: unknown): BrainstormRunResponse {
    const parsed = StartBrainstormRunRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return {
      run: this.translate(() => this.runner.startRun(id, parsed.data.prompt, parsed.data.mode)),
    };
  }

  @Post(':id/runs/:runId/contributors/:runContributorId/skip')
  skipRunContributor(
    @Param('id') id: string,
    @Param('runId') runId: string,
    @Param('runContributorId') runContributorId: string,
  ): BrainstormRunResponse {
    return {
      run: this.translate(() => this.runner.skipContributor(id, runId, runContributorId)),
    };
  }

  @Post(':id/runs/:runId/contributors/:runContributorId/retry')
  retryRunContributor(
    @Param('id') id: string,
    @Param('runId') runId: string,
    @Param('runContributorId') runContributorId: string,
  ): BrainstormRunResponse {
    return {
      run: this.translate(() => this.runner.retryContributor(id, runId, runContributorId)),
    };
  }

  @Post(':id/runs/:runId/synthesis/retry')
  retrySynthesis(
    @Param('id') id: string,
    @Param('runId') runId: string,
    @Body() body: unknown,
  ): BrainstormRunResponse {
    const parsed = RetryBrainstormSynthesisRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { run: this.translate(() => this.runner.retrySynthesis(id, runId, parsed.data.mode)) };
  }

  @Get(':id/runs')
  listRuns(@Param('id') id: string): BrainstormRunsResponse {
    this.translate(() => this.service.getBrainstorm(id)); // 404 on unknown brainstorm
    return { runs: this.repo.listRuns(id).map((row) => this.repo.hydrateRun(row)) };
  }

  @Get(':id/runs/:runId')
  getRun(@Param('id') id: string, @Param('runId') runId: string): BrainstormRunResponse {
    const row = this.repo.getRun(runId);
    if (!row || row.brainstormId !== id) {
      throw new NotFoundException(`run ${runId} not found on brainstorm ${id}`);
    }
    return { run: this.repo.hydrateRun(row) };
  }

  // Map domain errors to HTTP at the boundary (services stay HTTP-agnostic).
  private translate<T>(fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      if (
        err instanceof BrainstormDoesNotExistError ||
        err instanceof BrainstormContributorDoesNotExistError
      ) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof BrainstormEmptyError) throw new BadRequestException(err.message);
      if (err instanceof BrainstormRunInProgressError) throw new ConflictException(err.message);
      if (err instanceof BrainstormContributorNotLiveError) {
        throw new ConflictException(err.message);
      }
      if (err instanceof BrainstormRunNotRetryableError) throw new ConflictException(err.message);
      throw err;
    }
  }
}
