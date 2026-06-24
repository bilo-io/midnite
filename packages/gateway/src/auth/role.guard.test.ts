import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { TeamRole } from '@midnite/shared';
import type { TeamsService } from '../teams/teams.service';
import { RoleGuard } from './role.guard';

// Minimal ExecutionContext builder — enough for RoleGuard's HTTP path.
function makeCtx(opts: {
  requiredRole?: TeamRole;
  user?: { userId: string; teamId: string | null } | null;
}): ExecutionContext {
  const req: Record<string, unknown> = {};
  if (opts.user !== undefined) req['user'] = opts.user;

  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeGuard(
  requiredRole: TeamRole | undefined,
  getMembership: (teamId: string, userId: string) => TeamRole | null,
): RoleGuard {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(requiredRole),
  } as unknown as Reflector;

  const teams = { getMembership: vi.fn(getMembership) } as unknown as TeamsService;
  return new RoleGuard(reflector, teams);
}

describe('RoleGuard', () => {
  it('passes when no @RequiresRole is set on the route', () => {
    const guard = makeGuard(undefined, () => null);
    expect(guard.canActivate(makeCtx({ requiredRole: undefined }))).toBe(true);
  });

  it('passes when req.user is absent (static-token / unauthenticated path)', () => {
    const guard = makeGuard('member', () => null);
    const ctx = makeCtx({ user: null });
    // Remove user entirely to simulate unauthenticated context.
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws 403 when user has no teamId (personal context, route requires role)', () => {
    const guard = makeGuard('member', () => null);
    const ctx = makeCtx({ user: { userId: 'u1', teamId: null } });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws 403 when user is not a team member', () => {
    const guard = makeGuard('member', () => null);
    const ctx = makeCtx({ user: { userId: 'u1', teamId: 'team-1' } });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws 403 when member attempts a route that requires admin+', () => {
    const guard = makeGuard('admin', () => 'member');
    const ctx = makeCtx({ user: { userId: 'u1', teamId: 'team-1' } });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('passes when member attempts a route that requires member', () => {
    const guard = makeGuard('member', () => 'member');
    const ctx = makeCtx({ user: { userId: 'u1', teamId: 'team-1' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('passes when admin attempts a route that requires member', () => {
    const guard = makeGuard('member', () => 'admin');
    const ctx = makeCtx({ user: { userId: 'u1', teamId: 'team-1' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('passes when admin attempts a route that requires admin', () => {
    const guard = makeGuard('admin', () => 'admin');
    const ctx = makeCtx({ user: { userId: 'u1', teamId: 'team-1' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('passes when viewer attempts a route that requires viewer', () => {
    const guard = makeGuard('viewer', () => 'viewer');
    const ctx = makeCtx({ user: { userId: 'u1', teamId: 'team-1' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('caches the resolved role on req so getMembership is only called once', () => {
    const getMembership = vi.fn().mockReturnValue('admin' as TeamRole | null);
    const guard = makeGuard('member', getMembership as (teamId: string, userId: string) => TeamRole | null);
    const ctx = makeCtx({ user: { userId: 'u1', teamId: 'team-1' } });

    guard.canActivate(ctx);
    guard.canActivate(ctx); // second call on same req

    expect(getMembership).toHaveBeenCalledTimes(1);
  });
});
