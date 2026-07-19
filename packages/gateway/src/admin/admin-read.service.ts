import { Inject, Injectable } from '@nestjs/common';
import type { AdminTeamSummary, AdminUserSummary, PlatformOverview } from '@midnite/shared';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { TeamsService } from '../teams/teams.service';
import { UsageService } from '../usage/usage.service';
import { UsersService } from '../users/users.service';

/**
 * Operator-console read layer (Phase 73 D). Composes the **existing** domain
 * services into the cross-tenant summaries the standalone `admin` app consumes
 * over the operator-gated `GET /admin/*` routes — no new tables, no new domain.
 * Every route is gated by `@RequiresOperator` at the controller.
 */
@Injectable()
export class AdminReadService {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(TeamsService) private readonly teams: TeamsService,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(UsageService) private readonly usage: UsageService,
  ) {}

  /** Every user on the platform, with their team-membership count. */
  listUsers(): AdminUserSummary[] {
    return this.users.listAllUsers().map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      ...(u.avatarUrl ? { avatarUrl: u.avatarUrl } : {}),
      teamCount: this.teams.listTeamsForUser(u.id).length,
    }));
  }

  /** Every team on the platform, with its member count. */
  listTeams(): AdminTeamSummary[] {
    return this.teams.listAllTeams().map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      createdAt: t.createdAt,
      memberCount: this.teams.memberCount(t.id),
    }));
  }

  /** Platform KPIs — counts + all-time estimated spend, composed from existing services. */
  overview(): PlatformOverview {
    const tasks = this.tasks.statusCounts();
    const { composition } = this.usage.summary({ groupBy: 'day' });
    const costUsd =
      composition.llmUsd + composition.sessionMeasuredUsd + composition.sessionEstimatedUsd;
    return {
      users: this.users.countUsers(),
      teams: this.teams.countTeams(),
      projects: this.projects.listProjects().length,
      tasks,
      activeSessions: tasks.wip,
      costUsd,
    };
  }
}
