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
  Query,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  CreateCouncilMemberRequestSchema,
  CreateCouncilRequestSchema,
  REPORT_CONTENT_TYPE,
  ReorderCouncilMembersRequestSchema,
  ReportFormatSchema,
  RetryCouncilSynthesisRequestSchema,
  StartCouncilRunRequestSchema,
  UpdateCouncilMemberRequestSchema,
  UpdateCouncilRequestSchema,
  isServerRenderedReportFormat,
  type Council,
  type CouncilMemberResponse,
  type CouncilResponse,
  type CouncilRunResponse,
  type CouncilRunsResponse,
} from '@midnite/shared';
import {
  CouncilEmptyError,
  CouncilMemberNotLiveError,
  CouncilRunInProgressError,
  CouncilRunNotRetryableError,
  CouncilRunnerService,
} from './council-runner.service';
import {
  CouncilDoesNotExistError,
  CouncilMemberDoesNotExistError,
  CouncilRunDoesNotExistError,
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

  @Post(':id/members')
  createMember(@Param('id') id: string, @Body() body: unknown): CouncilMemberResponse {
    const parsed = CreateCouncilMemberRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { member: this.translate(() => this.service.createMember(id, parsed.data)) };
  }

  // Static segment, so it never collides with `:memberId` below.
  @Post(':id/members/reorder')
  reorderMembers(@Param('id') id: string, @Body() body: unknown): CouncilResponse {
    const parsed = ReorderCouncilMembersRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return {
      council: this.translate(() => this.service.reorderMembers(id, parsed.data.memberIds)),
    };
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: unknown,
  ): CouncilMemberResponse {
    const parsed = UpdateCouncilMemberRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return {
      member: this.translate(() => this.service.updateMember(id, memberId, parsed.data)),
    };
  }

  @Delete(':id/members/:memberId')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string): { ok: true } {
    this.translate(() => this.service.deleteMember(id, memberId));
    return { ok: true };
  }

  @Post(':id/runs')
  startRun(@Param('id') id: string, @Body() body: unknown): CouncilRunResponse {
    const parsed = StartCouncilRunRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return {
      run: this.translate(() => this.runner.startRun(id, parsed.data.prompt, parsed.data.format)),
    };
  }

  @Post(':id/runs/:runId/members/:runMemberId/skip')
  skipRunMember(
    @Param('id') id: string,
    @Param('runId') runId: string,
    @Param('runMemberId') runMemberId: string,
  ): CouncilRunResponse {
    return { run: this.translate(() => this.runner.skipMember(id, runId, runMemberId)) };
  }

  @Post(':id/runs/:runId/members/:runMemberId/retry')
  retryRunMember(
    @Param('id') id: string,
    @Param('runId') runId: string,
    @Param('runMemberId') runMemberId: string,
  ): CouncilRunResponse {
    return { run: this.translate(() => this.runner.retryMember(id, runId, runMemberId)) };
  }

  @Post(':id/runs/:runId/synthesis/retry')
  retrySynthesis(
    @Param('id') id: string,
    @Param('runId') runId: string,
    @Body() body: unknown,
  ): CouncilRunResponse {
    const parsed = RetryCouncilSynthesisRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { run: this.translate(() => this.runner.retrySynthesis(id, runId, parsed.data.format)) };
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

  /**
   * Export a council run as a report. Only `md` is built here — the service
   * assembles it via the pure markdown builder, and the response is streamed back
   * as a `text/markdown` attachment. `pdf` is rendered client-side from this same
   * markdown (Electron `printToPDF` / the browser print dialog), so it is rejected
   * here with a 400 explaining where it's produced.
   */
  @Get(':id/runs/:runId/export')
  exportRun(
    @Param('id') id: string,
    @Param('runId') runId: string,
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
    const { filename, markdown } = this.translate(() =>
      this.service.exportRunMarkdown(id, runId),
    );
    void reply
      .header('content-type', REPORT_CONTENT_TYPE.md)
      .header('content-disposition', `attachment; filename="${filename}"`)
      .send(markdown);
  }

  // Map domain errors to HTTP at the boundary (services stay HTTP-agnostic).
  private translate<T>(fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      if (
        err instanceof CouncilDoesNotExistError ||
        err instanceof CouncilMemberDoesNotExistError ||
        err instanceof CouncilRunDoesNotExistError
      ) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof CouncilEmptyError) throw new BadRequestException(err.message);
      if (err instanceof CouncilRunInProgressError) throw new ConflictException(err.message);
      if (err instanceof CouncilMemberNotLiveError) throw new ConflictException(err.message);
      if (err instanceof CouncilRunNotRetryableError) throw new ConflictException(err.message);
      throw err;
    }
  }
}
