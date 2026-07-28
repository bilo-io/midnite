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
  AddMilestoneDependencyRequestSchema,
  AssignMilestoneRequestSchema,
  CreateMilestoneRequestSchema,
  ReorderMilestoneTasksRequestSchema,
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

  @Post('milestones/:id/tasks/reorder')
  @RequiresRole('member')
  reorderTasks(
    @Param('id') milestoneId: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): { ok: true } {
    const parsed = ReorderMilestoneTasksRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    this.service.reorderTasks(milestoneId, parsed.data.ids, toScope(user));
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

  // Add a "blocked by" edge — the milestone graph's editable connect gesture. A
  // self-reference / cross-project pair / unknown milestone / cycle all 400
  // (the service's `BadRequestException`); a missing :id milestone 404s.
  @Post('milestones/:id/dependencies')
  @RequiresRole('member')
  addDependency(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): MilestoneResponse {
    const parsed = AddMilestoneDependencyRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { milestone: this.service.addDependency(id, parsed.data.dependsOnId, toScope(user)) };
  }

  @Delete('milestones/:id/dependencies/:dependsOnId')
  @RequiresRole('member')
  removeDependency(
    @Param('id') id: string,
    @Param('dependsOnId') dependsOnId: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): MilestoneResponse {
    return { milestone: this.service.removeDependency(id, dependsOnId, toScope(user)) };
  }
}
