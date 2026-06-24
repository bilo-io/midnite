import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { TeamsRepository } from './teams.repository';
import {
  InsufficientTeamRoleError,
  TeamDoesNotExistError,
  TeamInviteDoesNotExistError,
  TeamInviteExpiredError,
  TeamSlugTakenError,
  TeamsService,
} from './teams.service';

function makeService(): TeamsService {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') });
  const repo = new TeamsRepository(db);
  return new TeamsService(repo);
}

describe('TeamsService', () => {
  let svc: TeamsService;

  beforeEach(() => {
    svc = makeService();
  });

  it('creates a team and assigns owner role to creator', () => {
    const team = svc.createTeam({ name: 'Acme', slug: 'acme' }, 'user-1');
    expect(team.slug).toBe('acme');
    expect(team.members).toHaveLength(1);
    expect(team.members[0]!.role).toBe('owner');
    expect(team.members[0]!.userId).toBe('user-1');
  });

  it('throws TeamSlugTakenError for duplicate slug', () => {
    svc.createTeam({ name: 'Acme', slug: 'acme' }, 'user-1');
    expect(() => svc.createTeam({ name: 'Acme 2', slug: 'acme' }, 'user-2')).toThrow(TeamSlugTakenError);
  });

  it('lists teams for user', () => {
    svc.createTeam({ name: 'Team A', slug: 'team-a' }, 'user-1');
    svc.createTeam({ name: 'Team B', slug: 'team-b' }, 'user-2');
    const teams = svc.listTeamsForUser('user-1');
    expect(teams).toHaveLength(1);
    expect(teams[0]!.slug).toBe('team-a');
  });

  it('throws TeamDoesNotExistError for unknown team', () => {
    expect(() => svc.getTeam('no-such-id')).toThrow(TeamDoesNotExistError);
  });

  it('updates team name (admin+)', () => {
    const team = svc.createTeam({ name: 'Old', slug: 'old-slug' }, 'user-1');
    const updated = svc.updateTeam(team.id, { name: 'New' }, 'user-1');
    expect(updated.name).toBe('New');
  });

  it('throws InsufficientTeamRoleError when non-admin tries to update', () => {
    const team = svc.createTeam({ name: 'T', slug: 't' }, 'owner');
    // Add a viewer member
    const repo = (svc as unknown as { repo: TeamsRepository }).repo;
    repo.insertMember({ teamId: team.id, userId: 'viewer', role: 'viewer', joinedAt: new Date().toISOString() });
    expect(() => svc.updateTeam(team.id, { name: 'X' }, 'viewer')).toThrow(InsufficientTeamRoleError);
  });

  it('creates and retrieves an invite', () => {
    const team = svc.createTeam({ name: 'T', slug: 't2' }, 'owner');
    const invite = svc.createInvite(team.id, { role: 'member', expiresInDays: 7 }, 'owner');
    expect(invite.teamId).toBe(team.id);
    expect(invite.role).toBe('member');
    const fetched = svc.getInvite(invite.token);
    expect(fetched.token).toBe(invite.token);
  });

  it('accepts an invite and adds user as member', () => {
    const team = svc.createTeam({ name: 'T', slug: 't3' }, 'owner');
    const invite = svc.createInvite(team.id, { role: 'member', expiresInDays: 1 }, 'owner');
    svc.acceptInvite(invite.token, 'new-user');
    const fetched = svc.getTeam(team.id);
    expect(fetched.members.some((m) => m.userId === 'new-user')).toBe(true);
  });

  it('throws TeamInviteDoesNotExistError when consuming already-accepted invite', () => {
    const team = svc.createTeam({ name: 'T', slug: 't4' }, 'owner');
    const invite = svc.createInvite(team.id, { role: 'member', expiresInDays: 1 }, 'owner');
    svc.acceptInvite(invite.token, 'user-x');
    expect(() => svc.acceptInvite(invite.token, 'user-y')).toThrow(TeamInviteDoesNotExistError);
  });

  it('throws TeamInviteExpiredError for expired invite', () => {
    const team = svc.createTeam({ name: 'T', slug: 't5' }, 'owner');
    const repo = (svc as unknown as { repo: TeamsRepository }).repo;
    // Insert an already-expired invite directly.
    const past = new Date(Date.now() - 1000).toISOString();
    const now = new Date().toISOString();
    const row = repo.insertInvite({
      id: 'inv-1',
      teamId: team.id,
      invitedBy: 'owner',
      email: null,
      token: 'expired-token',
      role: 'member',
      expiresAt: past,
      createdAt: now,
    });
    expect(() => svc.acceptInvite(row.token, 'user-z')).toThrow(TeamInviteExpiredError);
  });

  it('deletes a team (owner only)', () => {
    const team = svc.createTeam({ name: 'T', slug: 't6' }, 'owner');
    svc.deleteTeam(team.id, 'owner');
    expect(() => svc.getTeam(team.id)).toThrow(TeamDoesNotExistError);
  });

  // --- Role management (Phase 35 B verification) ---

  it('member cannot change another member role', () => {
    const team = svc.createTeam({ name: 'T', slug: 'roles-1' }, 'owner');
    const repo = (svc as unknown as { repo: TeamsRepository }).repo;
    const now = new Date().toISOString();
    repo.insertMember({ teamId: team.id, userId: 'member-caller', role: 'member', joinedAt: now });
    repo.insertMember({ teamId: team.id, userId: 'member-target', role: 'member', joinedAt: now });
    expect(() => svc.setMemberRole(team.id, 'member-target', 'viewer', 'member-caller')).toThrow(
      InsufficientTeamRoleError,
    );
  });

  it('admin can change a member role', () => {
    const team = svc.createTeam({ name: 'T', slug: 'roles-2' }, 'owner');
    const repo = (svc as unknown as { repo: TeamsRepository }).repo;
    const now = new Date().toISOString();
    repo.insertMember({ teamId: team.id, userId: 'admin-caller', role: 'admin', joinedAt: now });
    repo.insertMember({ teamId: team.id, userId: 'member-target', role: 'member', joinedAt: now });
    svc.setMemberRole(team.id, 'member-target', 'viewer', 'admin-caller');
    expect(svc.getMembership(team.id, 'member-target')).toBe('viewer');
  });

  it('admin cannot promote a member to owner (beyond own role)', () => {
    const team = svc.createTeam({ name: 'T', slug: 'roles-3' }, 'owner');
    const repo = (svc as unknown as { repo: TeamsRepository }).repo;
    const now = new Date().toISOString();
    repo.insertMember({ teamId: team.id, userId: 'admin-caller', role: 'admin', joinedAt: now });
    repo.insertMember({ teamId: team.id, userId: 'member-target', role: 'member', joinedAt: now });
    expect(() => svc.setMemberRole(team.id, 'member-target', 'owner', 'admin-caller')).toThrow(
      InsufficientTeamRoleError,
    );
  });

  it('owner can promote a member to owner', () => {
    const team = svc.createTeam({ name: 'T', slug: 'roles-4' }, 'owner');
    const repo = (svc as unknown as { repo: TeamsRepository }).repo;
    repo.insertMember({ teamId: team.id, userId: 'member-target', role: 'member', joinedAt: new Date().toISOString() });
    svc.setMemberRole(team.id, 'member-target', 'owner', 'owner');
    expect(svc.getMembership(team.id, 'member-target')).toBe('owner');
  });

  it('owner can demote an admin', () => {
    const team = svc.createTeam({ name: 'T', slug: 'roles-5' }, 'owner');
    const repo = (svc as unknown as { repo: TeamsRepository }).repo;
    repo.insertMember({ teamId: team.id, userId: 'admin-target', role: 'admin', joinedAt: new Date().toISOString() });
    svc.setMemberRole(team.id, 'admin-target', 'member', 'owner');
    expect(svc.getMembership(team.id, 'admin-target')).toBe('member');
  });
});
