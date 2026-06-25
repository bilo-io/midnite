import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { TeamRole } from '@midnite/shared';
import { TeamsService } from '../teams/teams.service';
import { REQUIRE_ROLE_KEY } from './decorators/require-role.decorator';

const ROLE_RANK: Record<TeamRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

function hasRole(actual: TeamRole, required: TeamRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

type IncomingRequest = {
  user?: { userId: string; teamId: string | null };
};

/**
 * Route-level guard (Phase 35 B1). Apply with @UseGuards(RoleGuard) on the
 * controller or individual route, paired with @RequiresRole(minRole).
 * Routes without @RequiresRole are unaffected (guard returns true immediately).
 *
 * When the user has no team context (teamId = null) or is not a member of the
 * resource's team, 403 is returned. Role is resolved once per request at guard
 * time and cached on req.resolvedRole to avoid redundant DB lookups.
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TeamsService) private readonly teams: TeamsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.getAllAndOverride<TeamRole | undefined>(REQUIRE_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRole) return true;

    const req = context.switchToHttp().getRequest<IncomingRequest & { resolvedRole?: TeamRole | null }>();
    const user = req.user;

    // Static-token / anonymous path: req.user is not set. Skip role enforcement
    // so existing single-user installs are unaffected (they have no teamId anyway).
    if (!user) return true;

    if (!user.userId || !user.teamId) {
      throw new ForbiddenException('insufficient role');
    }

    // Cache per-request so the guard can be stacked without redundant queries.
    if (req.resolvedRole === undefined) {
      req.resolvedRole = this.teams.getMembership(user.teamId, user.userId);
    }

    if (!req.resolvedRole || !hasRole(req.resolvedRole, requiredRole)) {
      throw new ForbiddenException('insufficient role');
    }

    return true;
  }
}
