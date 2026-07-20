import { Inject, Injectable, Optional } from '@nestjs/common';
import type {
  CreateInviteRequest,
  CreateTeamRequest,
  Team,
  TeamInvite,
  TeamRole,
  TeamWithMembers,
  UpdateTeamRequest,
} from '@midnite/shared';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service.js';
import { TeamsRepository } from './teams.repository.js';

export class TeamDoesNotExistError extends Error {
  constructor(id: string) {
    super(`team ${id} does not exist`);
    this.name = 'TeamDoesNotExistError';
  }
}

export class TeamSlugTakenError extends Error {
  constructor(slug: string) {
    super(`slug "${slug}" is already taken`);
    this.name = 'TeamSlugTakenError';
  }
}

export class TeamMembershipDoesNotExistError extends Error {
  constructor() {
    super('not a member of this team');
    this.name = 'TeamMembershipDoesNotExistError';
  }
}

export class TeamInviteDoesNotExistError extends Error {
  constructor() {
    super('invite token not found or already used');
    this.name = 'TeamInviteDoesNotExistError';
  }
}

export class TeamInviteExpiredError extends Error {
  constructor() {
    super('invite token has expired');
    this.name = 'TeamInviteExpiredError';
  }
}

export class InsufficientTeamRoleError extends Error {
  constructor() {
    super('insufficient role for this operation');
    this.name = 'InsufficientTeamRoleError';
  }
}

const ROLE_RANK: Record<TeamRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

function hasRole(actual: TeamRole, required: TeamRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

@Injectable()
export class TeamsService {
  constructor(
    @Inject(TeamsRepository) private readonly repo: TeamsRepository,
    @Optional() @Inject(AuditService) private readonly audit?: AuditService,
  ) {}

  createTeam(req: CreateTeamRequest, createdBy: string): TeamWithMembers {
    const existing = this.repo.findBySlug(req.slug);
    if (existing) throw new TeamSlugTakenError(req.slug);

    const now = new Date().toISOString();
    const id = randomUUID();

    this.repo.insert({ id, slug: req.slug, name: req.name, createdBy, createdAt: now });
    this.repo.insertMember({ teamId: id, userId: createdBy, role: 'owner', joinedAt: now });

    this.audit?.record({ entityType: 'team', entityId: id, userId: createdBy, action: 'team.created' });
    this.audit?.record({ entityType: 'team', entityId: id, userId: createdBy, action: 'team.member_added', payload: { memberId: createdBy, role: 'owner' } });

    return this.repo.hydrateTeamWithMembers(this.repo.findById(id)!);
  }

  getTeam(id: string): TeamWithMembers {
    const row = this.repo.findById(id);
    if (!row) throw new TeamDoesNotExistError(id);
    return this.repo.hydrateTeamWithMembers(row);
  }

  listTeamsForUser(userId: string): Team[] {
    return this.repo.listByUser(userId).map((r) => this.repo.hydrateTeam(r));
  }

  /** All teams, oldest first (Phase 73 D — the operator console's cross-tenant list). */
  listAllTeams(): Team[] {
    return this.repo.listAll().map((r) => this.repo.hydrateTeam(r));
  }

  /** Total team count (Phase 73 D — platform overview KPI). */
  countTeams(): number {
    return this.repo.count();
  }

  /** Member count for a team (Phase 73 D — the admin team summary). */
  memberCount(teamId: string): number {
    return this.repo.countMembers(teamId);
  }

  updateTeam(id: string, req: UpdateTeamRequest, callerId: string): TeamWithMembers {
    this.assertRole(id, callerId, 'admin');
    const row = this.repo.update(id, { name: req.name });
    if (!row) throw new TeamDoesNotExistError(id);
    return this.repo.hydrateTeamWithMembers(row);
  }

  deleteTeam(id: string, callerId: string): void {
    this.assertRole(id, callerId, 'owner');
    this.repo.delete(id);
  }

  setMemberRole(teamId: string, userId: string, role: TeamRole, callerId: string): void {
    this.assertRole(teamId, callerId, 'admin');
    const existing = this.repo.findMember(teamId, userId);
    if (!existing) throw new TeamMembershipDoesNotExistError();
    // Cannot change an owner's role unless the caller is also an owner.
    if (existing.role === 'owner') this.assertRole(teamId, callerId, 'owner');
    // Cannot promote someone to a role above your own (only owners can grant owner).
    if (role === 'owner') this.assertRole(teamId, callerId, 'owner');
    this.repo.setRole(teamId, userId, role);
    this.audit?.record({ entityType: 'team', entityId: teamId, userId: callerId, action: 'team.member_role_changed', payload: { memberId: userId, role } });
  }

  removeMember(teamId: string, userId: string, callerId: string): void {
    // Members may leave themselves; admins can remove others.
    if (callerId !== userId) this.assertRole(teamId, callerId, 'admin');
    const existing = this.repo.findMember(teamId, userId);
    if (!existing) throw new TeamMembershipDoesNotExistError();
    if (existing.role === 'owner') throw new InsufficientTeamRoleError();
    this.repo.removeMember(teamId, userId);
    this.audit?.record({ entityType: 'team', entityId: teamId, userId: callerId, action: 'team.member_removed', payload: { memberId: userId } });
  }

  createInvite(teamId: string, req: CreateInviteRequest, callerId: string): TeamInvite {
    this.assertRole(teamId, callerId, 'admin');
    const team = this.repo.findById(teamId);
    if (!team) throw new TeamDoesNotExistError(teamId);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + req.expiresInDays * 86400_000).toISOString();
    const row = this.repo.insertInvite({
      id: randomUUID(),
      teamId,
      invitedBy: callerId,
      email: req.email ?? null,
      token: randomUUID(),
      role: req.role,
      expiresAt,
      createdAt: now.toISOString(),
    });
    return this.repo.hydrateInvite(row);
  }

  getInvite(token: string): TeamInvite {
    const row = this.repo.findInviteByToken(token);
    if (!row || row.acceptedAt) throw new TeamInviteDoesNotExistError();
    return this.repo.hydrateInvite(row);
  }

  acceptInvite(token: string, userId: string): void {
    const row = this.repo.findInviteByToken(token);
    if (!row || row.acceptedAt) throw new TeamInviteDoesNotExistError();
    if (new Date(row.expiresAt) < new Date()) throw new TeamInviteExpiredError();

    const now = new Date().toISOString();
    const existingMember = this.repo.findMember(row.teamId, userId);
    if (!existingMember) {
      this.repo.insertMember({ teamId: row.teamId, userId, role: row.role, joinedAt: now });
      this.audit?.record({ entityType: 'team', entityId: row.teamId, userId, action: 'team.member_added', payload: { memberId: userId, role: row.role } });
    }
    this.repo.acceptInvite(row.id, now);
  }

  listInvites(teamId: string, callerId: string): TeamInvite[] {
    this.assertRole(teamId, callerId, 'admin');
    return this.repo.listInvites(teamId).map((r) => this.repo.hydrateInvite(r));
  }

  revokeInvite(teamId: string, inviteId: string, callerId: string): void {
    this.assertRole(teamId, callerId, 'admin');
    this.repo.revokeInvite(inviteId);
  }

  /** Returns the user's role in the given team, or null if they're not a member. */
  getMembership(teamId: string, userId: string): TeamRole | null {
    const m = this.repo.findMember(teamId, userId);
    return m ? (m.role as TeamRole) : null;
  }

  private assertRole(teamId: string, userId: string, required: TeamRole): void {
    const m = this.repo.findMember(teamId, userId);
    if (!m || !hasRole(m.role as TeamRole, required)) {
      throw new InsufficientTeamRoleError();
    }
  }
}
