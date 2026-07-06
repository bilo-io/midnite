import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  AssignMilestoneRequestSchema,
  CreateMilestoneRequestSchema,
  ReorderMilestonesRequestSchema,
  UpdateMilestoneRequestSchema,
  type Milestone,
  type MilestoneResponse,
  type RoadmapResponse,
  type Task,
  type TeamScope,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { MilestonesService } from './milestones.service';

function toScope(user: CurrentUserPayload | null | undefined): TeamScope | undefined {
  return user ? { userId: user.userId, teamId: user.teamId } : undefined;
}

/**
 * Phase 58 D — roadmap milestone routes. Spans two path families (`/projects/:id/*`
 * for milestone CRUD + the roadmap rollup, `/tasks/:id/milestone` for assignment)
 * so the ownership stays one-directional (milestones → tasks); hence explicit full
 * paths on an unprefixed controller rather than a shared prefix.
 */
@Controller()
export class MilestonesController {
  constructor(@Inject(MilestonesService) private readonly service: MilestonesService) {}

  @Get('projects/:id/milestones')
  list(@Param('id') projectId: string, @CurrentUser() user?: CurrentUserPayload | null): Milestone[] {
    return this.service.listByProject(projectId, toScope(user));
  }

  @Get('projects/:id/roadmap')
  roadmap(@Param('id') projectId: string, @CurrentUser() user?: CurrentUserPayload | null): RoadmapResponse {
    return { roadmap: this.service.getRoadmap(projectId, toScope(user)) };
  }

  @Post('projects/:id/milestones')
  @RequiresRole('member')
  create(
    @Param('id') projectId: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): MilestoneResponse {
    const parsed = CreateMilestoneRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { milestone: this.service.create(projectId, parsed.data, toScope(user)) };
  }

  @Post('projects/:id/milestones/reorder')
  @RequiresRole('member')
  reorder(
    @Param('id') projectId: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Milestone[] {
    const parsed = ReorderMilestonesRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.reorder(projectId, parsed.data.milestoneIds, toScope(user));
  }

  @Patch('milestones/:id')
  @RequiresRole('member')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): MilestoneResponse {
    const parsed = UpdateMilestoneRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { milestone: this.service.update(id, parsed.data, toScope(user)) };
  }

  @Delete('milestones/:id')
  @RequiresRole('member')
  remove(@Param('id') id: string, @CurrentUser() user?: CurrentUserPayload | null): { ok: true } {
    this.service.delete(id, toScope(user));
    return { ok: true };
  }

  @Patch('tasks/:id/milestone')
  @RequiresRole('member')
  assign(
    @Param('id') taskId: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Task {
    const parsed = AssignMilestoneRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.assignTask(taskId, parsed.data.milestoneId, toScope(user));
  }
}
