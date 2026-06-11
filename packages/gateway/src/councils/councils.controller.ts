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
  CreateCouncilParticipantRequestSchema,
  CreateCouncilRequestSchema,
  StartCouncilRunRequestSchema,
  UpdateCouncilParticipantRequestSchema,
  UpdateCouncilRequestSchema,
  type Council,
  type CouncilParticipantResponse,
  type CouncilResponse,
  type CouncilRunResponse,
  type CouncilRunsResponse,
} from '@midnite/shared';
import {
  CouncilRunInProgressError,
  CouncilRunnerService,
  CouncilTooSmallError,
} from './council-runner.service';
import {
  CouncilDoesNotExistError,
  CouncilParticipantDoesNotExistError,
  CouncilsService,
} from './councils.service';
import { CouncilsRepository } from './councils.repository';

@Controller('councils')
export class CouncilsController {
  constructor(
    @Inject(CouncilsService) private readonly service: CouncilsService,
    @Inject(CouncilRunnerService) private readonly runner: CouncilRunnerService,
    @Inject(CouncilsRepository) private readonly repo: CouncilsRepository,
  ) {}

  @Get()
  list(): Council[] {
    return this.service.listCouncils();
  }

  @Post()
  create(@Body() body: unknown): CouncilResponse {
    const parsed = CreateCouncilRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { council: this.service.createCouncil(parsed.data) };
  }

  @Get(':id')
  get(@Param('id') id: string): CouncilResponse {
    return { council: this.translate(() => this.service.getCouncil(id)) };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown): CouncilResponse {
    const parsed = UpdateCouncilRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { council: this.translate(() => this.service.updateCouncil(id, parsed.data)) };
  }

  @Delete(':id')
  remove(@Param('id') id: string): { ok: true } {
    this.translate(() => this.service.deleteCouncil(id));
    return { ok: true };
  }

  @Post(':id/participants')
  createParticipant(@Param('id') id: string, @Body() body: unknown): CouncilParticipantResponse {
    const parsed = CreateCouncilParticipantRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { participant: this.translate(() => this.service.createParticipant(id, parsed.data)) };
  }

  @Patch(':id/participants/:participantId')
  updateParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @Body() body: unknown,
  ): CouncilParticipantResponse {
    const parsed = UpdateCouncilParticipantRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return {
      participant: this.translate(() =>
        this.service.updateParticipant(id, participantId, parsed.data),
      ),
    };
  }

  @Delete(':id/participants/:participantId')
  removeParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
  ): { ok: true } {
    this.translate(() => this.service.deleteParticipant(id, participantId));
    return { ok: true };
  }

  @Post(':id/runs')
  startRun(@Param('id') id: string, @Body() body: unknown): CouncilRunResponse {
    const parsed = StartCouncilRunRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { run: this.translate(() => this.runner.startRun(id, parsed.data.topic)) };
  }

  @Get(':id/runs')
  listRuns(@Param('id') id: string): CouncilRunsResponse {
    this.translate(() => this.service.getCouncil(id)); // 404 on unknown council
    return { runs: this.repo.listRuns(id).map((row) => this.repo.hydrateRun(row)) };
  }

  @Get(':id/runs/:runId')
  getRun(@Param('id') id: string, @Param('runId') runId: string): CouncilRunResponse {
    const row = this.repo.getRun(runId);
    if (!row || row.councilId !== id) {
      throw new NotFoundException(`run ${runId} not found on council ${id}`);
    }
    return { run: this.repo.hydrateRun(row) };
  }

  // Map domain errors to HTTP at the boundary (services stay HTTP-agnostic).
  private translate<T>(fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      if (
        err instanceof CouncilDoesNotExistError ||
        err instanceof CouncilParticipantDoesNotExistError
      ) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof CouncilTooSmallError) throw new BadRequestException(err.message);
      if (err instanceof CouncilRunInProgressError) throw new ConflictException(err.message);
      throw err;
    }
  }
}
