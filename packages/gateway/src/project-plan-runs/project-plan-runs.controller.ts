import { BadRequestException, Controller, Get, Inject, NotFoundException, Param, Post, Body } from '@nestjs/common';
import {
  StartOverviewRunRequestSchema,
  type OverviewRunResponse,
  type StartOverviewRunResponse,
} from '@midnite/shared';
import { ProjectPlanRunDoesNotExistError, ProjectPlanRunnerService } from './project-plan-runner.service';

/** Thin routes for the draft-plan Stage 1 overview run, nested under
 *  `/projects/:id/plan` (mirrors the project-docs controller's shape). */
@Controller('projects/:id/plan')
export class ProjectPlanRunsController {
  constructor(@Inject(ProjectPlanRunnerService) private readonly service: ProjectPlanRunnerService) {}

  @Post('overview-runs')
  start(@Param('id') id: string, @Body() body: unknown): StartOverviewRunResponse {
    const parsed = StartOverviewRunRequestSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.startOverviewRun(id, parsed.data.docIds);
  }

  @Get('overview-runs/:runId')
  get(@Param('id') id: string, @Param('runId') runId: string): OverviewRunResponse {
    try {
      return this.service.getOverviewRun(id, runId);
    } catch (err) {
      if (err instanceof ProjectPlanRunDoesNotExistError) throw new NotFoundException(err.message);
      throw err;
    }
  }
}
