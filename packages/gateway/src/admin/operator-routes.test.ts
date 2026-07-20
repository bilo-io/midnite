import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import {
  AdminTeamSummarySchema,
  AdminUserSummarySchema,
  PlatformOverviewSchema,
  type AdminTeamSummary,
  type AdminUserSummary,
  type PlatformOverview,
} from '@midnite/shared';
import { REQUIRE_OPERATOR_KEY } from '../auth/decorators/require-operator.decorator';
import { AuditController } from '../audit/audit.controller';
import { MetricsController } from '../metrics/metrics.controller';
import { UsageController } from '../usage/usage.controller';
import { TeamsController } from '../teams/teams.controller';
import type { AdminReadService } from './admin-read.service';
import type { BackupService } from './backup.service';
import { AdminController } from './admin.controller';

const reflector = new Reflector();

/** Every own method on a controller prototype (the route handlers), minus the ctor. */
function handlerNames(ctor: { prototype: object }): string[] {
  return Object.getOwnPropertyNames(ctor.prototype).filter(
    (name) => name !== 'constructor' && typeof (ctor.prototype as Record<string, unknown>)[name] === 'function',
  );
}

/** Whether a route handler carries the `@RequiresOperator()` metadata. */
function requiresOperator(ctor: { prototype: object }, method: string): boolean {
  const handler = (ctor.prototype as Record<string, unknown>)[method];
  return reflector.get<boolean>(REQUIRE_OPERATOR_KEY, handler as never) === true;
}

// The operator gate (Phase 73 D) is a cross-tenant admin surface. This spec pins
// two invariants the console + the fleet both depend on: (1) only the three
// `/admin` READ routes are operator-gated, and (2) the team-scoped surfaces stay
// reachable by ordinary (non-operator) users — they must NOT have been retro-gated.
describe('operator-gate route coverage', () => {
  it('gates exactly the three /admin cross-tenant read routes', () => {
    expect(requiresOperator(AdminController, 'listUsers')).toBe(true);
    expect(requiresOperator(AdminController, 'listTeams')).toBe(true);
    expect(requiresOperator(AdminController, 'overview')).toBe(true);
    // The backup write is not an operator read route (its own auth applies).
    expect(requiresOperator(AdminController, 'createBackup')).toBe(false);
  });

  it.each([
    ['UsageController', UsageController],
    ['MetricsController', MetricsController],
    ['AuditController', AuditController],
    ['TeamsController', TeamsController],
  ] as const)('leaves every %s route reachable by non-operators (no @RequiresOperator)', (_name, ctor) => {
    for (const method of handlerNames(ctor)) {
      expect(requiresOperator(ctor, method)).toBe(false);
    }
  });
});

// The three aggregate reads are consumed by the operator console as `@midnite/shared`
// zod shapes. These assert the controller returns data that VALIDATES against those
// contracts (not just that it delegates), so a service shape drift is caught here.
describe('AdminController aggregate response shapes', () => {
  const users: AdminUserSummary[] = [
    { id: 'usr_1', email: 'a@x.io', name: 'A', createdAt: '2026-01-01T00:00:00.000Z', teamCount: 2 },
  ];
  const teams: AdminTeamSummary[] = [
    { id: 'team_1', slug: 'acme', name: 'Acme', createdAt: '2026-01-01T00:00:00.000Z', memberCount: 3 },
  ];
  const overview: PlatformOverview = {
    users: 1,
    teams: 1,
    projects: 4,
    tasks: { backlog: 0, todo: 2, wip: 1, waiting: 0, done: 5, abandoned: 1 },
    activeSessions: 1,
    costUsd: 12.5,
  };

  function build() {
    const read = {
      listUsers: vi.fn(() => users),
      listTeams: vi.fn(() => teams),
      overview: vi.fn(() => overview),
    } as unknown as AdminReadService;
    const backup = { backup: vi.fn() } as unknown as BackupService;
    return new AdminController(backup, read);
  }

  it('overview validates against PlatformOverviewSchema', () => {
    expect(() => PlatformOverviewSchema.parse(build().overview())).not.toThrow();
  });

  it('listUsers validates against AdminUserSummarySchema[]', () => {
    expect(() => AdminUserSummarySchema.array().parse(build().listUsers())).not.toThrow();
  });

  it('listTeams validates against AdminTeamSummarySchema[]', () => {
    expect(() => AdminTeamSummarySchema.array().parse(build().listTeams())).not.toThrow();
  });
});
