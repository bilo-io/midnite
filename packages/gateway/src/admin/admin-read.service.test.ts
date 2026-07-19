import { describe, expect, it, vi } from 'vitest';
import type { Team, User } from '@midnite/shared';
import type { ProjectsService } from '../projects/projects.service';
import type { TasksService } from '../tasks/tasks.service';
import type { TeamsService } from '../teams/teams.service';
import type { UsageService } from '../usage/usage.service';
import type { UsersService } from '../users/users.service';
import { AdminReadService } from './admin-read.service';

const user = (id: string, over: Partial<User> = {}): User => ({
  id,
  email: `${id}@x.io`,
  name: id.toUpperCase(),
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});
const team = (id: string): Team => ({
  id,
  slug: id,
  name: id.toUpperCase(),
  createdBy: 'u1',
  createdAt: '2026-01-01T00:00:00Z',
});

function build() {
  const users = {
    listAllUsers: vi.fn(() => [user('u1', { avatarUrl: 'https://a/x.png' }), user('u2')]),
    countUsers: vi.fn(() => 2),
  } as unknown as UsersService;
  const teams = {
    listTeamsForUser: vi.fn((uid: string) => (uid === 'u1' ? [team('t1'), team('t2')] : [])),
    listAllTeams: vi.fn(() => [team('t1')]),
    countTeams: vi.fn(() => 1),
    memberCount: vi.fn(() => 3),
  } as unknown as TeamsService;
  const projects = { listProjects: vi.fn(() => [{}, {}, {}, {}]) } as unknown as ProjectsService;
  const tasks = {
    statusCounts: vi.fn(() => ({ backlog: 0, todo: 2, wip: 1, waiting: 0, done: 5, abandoned: 1 })),
  } as unknown as TasksService;
  const usage = {
    summary: vi.fn(() => ({
      composition: { llmUsd: 2, sessionMeasuredUsd: 8, sessionEstimatedUsd: 0.5, unpricedSessions: 0 },
    })),
  } as unknown as UsageService;
  return { svc: new AdminReadService(users, teams, projects, tasks, usage), usage };
}

describe('AdminReadService', () => {
  it('lists users with their team-membership count + avatar when present', () => {
    const { svc } = build();
    expect(svc.listUsers()).toEqual([
      { id: 'u1', email: 'u1@x.io', name: 'U1', createdAt: '2026-01-01T00:00:00Z', avatarUrl: 'https://a/x.png', teamCount: 2 },
      { id: 'u2', email: 'u2@x.io', name: 'U2', createdAt: '2026-01-01T00:00:00Z', teamCount: 0 },
    ]);
  });

  it('lists teams with their member count', () => {
    const { svc } = build();
    expect(svc.listTeams()).toEqual([
      { id: 't1', slug: 't1', name: 'T1', createdAt: '2026-01-01T00:00:00Z', memberCount: 3 },
    ]);
  });

  it('composes the platform overview (activeSessions = wip, costUsd = summed composition)', () => {
    const { svc, usage } = build();
    expect(svc.overview()).toEqual({
      users: 2,
      teams: 1,
      projects: 4,
      tasks: { backlog: 0, todo: 2, wip: 1, waiting: 0, done: 5, abandoned: 1 },
      activeSessions: 1,
      costUsd: 10.5,
    });
    expect(usage.summary).toHaveBeenCalledWith({ groupBy: 'day' });
  });
});
