import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Team, TeamInvite, TeamMember, TeamRole, TeamWithMembers } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module.js';
import {
  type TeamInsert,
  type TeamInviteInsert,
  type TeamInviteRow,
  type TeamMembershipInsert,
  type TeamMembershipRow,
  type TeamRow,
  teamInvites,
  teamMemberships,
  teams,
} from '../db/schema.js';

@Injectable()
export class TeamsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: TeamInsert): TeamRow {
    return this.db.insert(teams).values(row).returning().get();
  }

  findById(id: string): TeamRow | undefined {
    return this.db.select().from(teams).where(eq(teams.id, id)).get();
  }

  findBySlug(slug: string): TeamRow | undefined {
    return this.db.select().from(teams).where(eq(teams.slug, slug)).get();
  }

  listByUser(userId: string): TeamRow[] {
    return this.db
      .select({ teams })
      .from(teams)
      .innerJoin(teamMemberships, and(eq(teamMemberships.teamId, teams.id), eq(teamMemberships.userId, userId)))
      .all()
      .map((r) => r.teams);
  }

  update(id: string, patch: { name?: string }): TeamRow | undefined {
    const updated = this.db.update(teams).set(patch).where(eq(teams.id, id)).returning().get();
    return updated ?? undefined;
  }

  delete(id: string): void {
    this.db.delete(teamMemberships).where(eq(teamMemberships.teamId, id)).run();
    this.db.delete(teamInvites).where(eq(teamInvites.teamId, id)).run();
    this.db.delete(teams).where(eq(teams.id, id)).run();
  }

  // ---- Membership ----

  insertMember(row: TeamMembershipInsert): TeamMembershipRow {
    return this.db.insert(teamMemberships).values(row).returning().get();
  }

  findMember(teamId: string, userId: string): TeamMembershipRow | undefined {
    return this.db
      .select()
      .from(teamMemberships)
      .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)))
      .get();
  }

  listMembers(teamId: string): TeamMembershipRow[] {
    return this.db.select().from(teamMemberships).where(eq(teamMemberships.teamId, teamId)).all();
  }

  setRole(teamId: string, userId: string, role: TeamRole): TeamMembershipRow | undefined {
    return (
      this.db
        .update(teamMemberships)
        .set({ role })
        .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)))
        .returning()
        .get() ?? undefined
    );
  }

  removeMember(teamId: string, userId: string): void {
    this.db
      .delete(teamMemberships)
      .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)))
      .run();
  }

  // ---- Invites ----

  insertInvite(row: TeamInviteInsert): TeamInviteRow {
    return this.db.insert(teamInvites).values(row).returning().get();
  }

  findInviteByToken(token: string): TeamInviteRow | undefined {
    return this.db.select().from(teamInvites).where(eq(teamInvites.token, token)).get();
  }

  listInvites(teamId: string): TeamInviteRow[] {
    return this.db.select().from(teamInvites).where(eq(teamInvites.teamId, teamId)).all();
  }

  acceptInvite(id: string, acceptedAt: string): TeamInviteRow | undefined {
    return (
      this.db.update(teamInvites).set({ acceptedAt }).where(eq(teamInvites.id, id)).returning().get() ?? undefined
    );
  }

  revokeInvite(id: string): void {
    this.db.delete(teamInvites).where(eq(teamInvites.id, id)).run();
  }

  // ---- Hydration ----

  hydrateTeam(row: TeamRow): Team {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }

  hydrateMember(row: TeamMembershipRow): TeamMember {
    return {
      teamId: row.teamId,
      userId: row.userId,
      role: row.role as TeamRole,
      joinedAt: row.joinedAt,
    };
  }

  hydrateInvite(row: TeamInviteRow): TeamInvite {
    return {
      id: row.id,
      teamId: row.teamId,
      invitedBy: row.invitedBy,
      email: row.email ?? null,
      token: row.token,
      role: row.role as TeamRole,
      expiresAt: row.expiresAt,
      acceptedAt: row.acceptedAt ?? null,
      createdAt: row.createdAt,
    };
  }

  hydrateTeamWithMembers(row: TeamRow): TeamWithMembers {
    const members = this.listMembers(row.id).map((m) => this.hydrateMember(m));
    return { ...this.hydrateTeam(row), members };
  }
}
