import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type {
  AgentCli,
  Council,
  CouncilFormat,
  CouncilMember,
  CouncilMemberRunStatus,
  CouncilRun,
  CouncilRunMember,
  CouncilRunStatus,
  CouncilSynthesisEntry,
} from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  councilMembers,
  councilRunMembers,
  councilRuns,
  councils,
  type CouncilInsert,
  type CouncilMemberInsert,
  type CouncilMemberRow,
  type CouncilRow,
  type CouncilRunInsert,
  type CouncilRunMemberInsert,
  type CouncilRunMemberRow,
  type CouncilRunRow,
} from '../db/schema';

@Injectable()
export class CouncilsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  // ---- councils ----

  listCouncils(): CouncilRow[] {
    return this.db.select().from(councils).orderBy(desc(councils.createdAt)).all();
  }

  getCouncil(id: string): CouncilRow | undefined {
    return this.db.select().from(councils).where(eq(councils.id, id)).get();
  }

  insertCouncil(row: CouncilInsert): CouncilRow {
    return this.db.insert(councils).values(row).returning().get();
  }

  updateCouncil(id: string, patch: Partial<CouncilInsert>): CouncilRow | undefined {
    return this.db.update(councils).set(patch).where(eq(councils.id, id)).returning().get();
  }

  /** Remove a council and its members. Run history is deleted with it. */
  deleteCouncil(id: string): void {
    this.db.transaction((tx) => {
      const runs = tx.select().from(councilRuns).where(eq(councilRuns.councilId, id)).all();
      for (const run of runs) {
        tx.delete(councilRunMembers).where(eq(councilRunMembers.runId, run.id)).run();
      }
      tx.delete(councilRuns).where(eq(councilRuns.councilId, id)).run();
      tx.delete(councilMembers).where(eq(councilMembers.councilId, id)).run();
      tx.delete(councils).where(eq(councils.id, id)).run();
    });
  }

  // ---- members ----

  listMembers(councilId: string): CouncilMemberRow[] {
    return this.db
      .select()
      .from(councilMembers)
      .where(eq(councilMembers.councilId, councilId))
      // Explicit order first; createdAt breaks ties (e.g. legacy rows at 0).
      .orderBy(asc(councilMembers.position), asc(councilMembers.createdAt))
      .all();
  }

  /** Next append position for a council (max existing + 1, or 0 when empty). */
  nextMemberPosition(councilId: string): number {
    const rows = this.db
      .select({ position: councilMembers.position })
      .from(councilMembers)
      .where(eq(councilMembers.councilId, councilId))
      .all();
    return rows.reduce((max, r) => Math.max(max, r.position), -1) + 1;
  }

  /** Persist a new order: each id's position becomes its index in the list. */
  reorderMembers(councilId: string, orderedIds: string[]): void {
    this.db.transaction((tx) => {
      orderedIds.forEach((id, position) => {
        tx.update(councilMembers)
          .set({ position })
          .where(and(eq(councilMembers.id, id), eq(councilMembers.councilId, councilId)))
          .run();
      });
    });
  }

  getMember(id: string): CouncilMemberRow | undefined {
    return this.db.select().from(councilMembers).where(eq(councilMembers.id, id)).get();
  }

  insertMember(row: CouncilMemberInsert): CouncilMemberRow {
    return this.db.insert(councilMembers).values(row).returning().get();
  }

  updateMember(id: string, patch: Partial<CouncilMemberInsert>): CouncilMemberRow | undefined {
    return this.db
      .update(councilMembers)
      .set(patch)
      .where(eq(councilMembers.id, id))
      .returning()
      .get();
  }

  deleteMember(id: string): void {
    this.db.delete(councilMembers).where(eq(councilMembers.id, id)).run();
  }

  // ---- runs ----

  listRuns(councilId: string): CouncilRunRow[] {
    return this.db
      .select()
      .from(councilRuns)
      .where(eq(councilRuns.councilId, councilId))
      .orderBy(desc(councilRuns.startedAt))
      .all();
  }

  getRun(id: string): CouncilRunRow | undefined {
    return this.db.select().from(councilRuns).where(eq(councilRuns.id, id)).get();
  }

  /** How many runs (consultations) a council has had. */
  countRuns(councilId: string): number {
    const row = this.db
      .select({ count: sql<number>`count(*)` })
      .from(councilRuns)
      .where(eq(councilRuns.councilId, councilId))
      .get();
    return row?.count ?? 0;
  }

  listStaleRuns(): CouncilRunRow[] {
    return this.db
      .select()
      .from(councilRuns)
      .all()
      .filter((r) => r.status === 'running' || r.status === 'synthesizing');
  }

  insertRun(row: CouncilRunInsert): CouncilRunRow {
    return this.db.insert(councilRuns).values(row).returning().get();
  }

  updateRun(id: string, patch: Partial<CouncilRunInsert>): CouncilRunRow | undefined {
    return this.db.update(councilRuns).set(patch).where(eq(councilRuns.id, id)).returning().get();
  }

  listRunMembers(runId: string): CouncilRunMemberRow[] {
    return this.db
      .select()
      .from(councilRunMembers)
      // Insertion order = the member order snapshotted at run start, which drives
      // the tab order. Stable across retries (those reset startedAt).
      .where(eq(councilRunMembers.runId, runId))
      .orderBy(asc(sql`rowid`))
      .all();
  }

  insertRunMember(row: CouncilRunMemberInsert): CouncilRunMemberRow {
    return this.db.insert(councilRunMembers).values(row).returning().get();
  }

  updateRunMember(
    id: string,
    patch: Partial<CouncilRunMemberInsert>,
  ): CouncilRunMemberRow | undefined {
    return this.db
      .update(councilRunMembers)
      .set(patch)
      .where(eq(councilRunMembers.id, id))
      .returning()
      .get();
  }

  private parseSyntheses(json: string | null): CouncilSynthesisEntry[] {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? (parsed as CouncilSynthesisEntry[]) : [];
    } catch {
      return [];
    }
  }

  /**
   * Upsert a completed synthesis for `entry.format` (keeping its position so chip
   * order is stable), so re-synthesizing in a new format accumulates an archive
   * rather than overwriting the previous one.
   */
  recordSynthesis(runId: string, entry: CouncilSynthesisEntry): void {
    const row = this.getRun(runId);
    if (!row) return;
    const list = this.parseSyntheses(row.syntheses);
    const idx = list.findIndex((e) => e.format === entry.format);
    const next = idx >= 0 ? list.map((e, i) => (i === idx ? entry : e)) : [...list, entry];
    this.updateRun(runId, { syntheses: JSON.stringify(next) });
  }

  // ---- hydration (DB row → API type) ----

  hydrateCouncil(row: CouncilRow): Council {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      synthProvider: row.synthProvider as AgentCli,
      defaultFormat: row.defaultFormat as CouncilFormat,
      customPrompt: row.customPrompt ?? undefined,
      members: this.listMembers(row.id).map((m) => this.hydrateMember(m)),
      consultationCount: this.countRuns(row.id),
      archived: row.archivedAt != null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  hydrateMember(row: CouncilMemberRow): CouncilMember {
    return {
      id: row.id,
      councilId: row.councilId,
      name: row.name,
      provider: row.provider as AgentCli,
      role: row.role,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  hydrateRun(row: CouncilRunRow): CouncilRun {
    return {
      id: row.id,
      councilId: row.councilId,
      prompt: row.prompt,
      format: row.format as CouncilFormat,
      status: row.status as CouncilRunStatus,
      synthProvider: (row.synthProvider as AgentCli | null) ?? undefined,
      // Deterministic attach id; the PTY behind it only exists while synthesizing.
      synthTerminalId: `council-${row.id}-synth`,
      synthesis: row.synthesis ?? undefined,
      syntheses: this.parseSyntheses(row.syntheses),
      error: row.error ?? undefined,
      members: this.listRunMembers(row.id).map((m) => this.hydrateRunMember(m)),
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? undefined,
    };
  }

  hydrateRunMember(row: CouncilRunMemberRow): CouncilRunMember {
    return {
      id: row.id,
      runId: row.runId,
      memberId: row.memberId,
      name: row.name,
      provider: row.provider as AgentCli,
      role: row.role,
      status: row.status as CouncilMemberRunStatus,
      terminalId: row.terminalId,
      output: row.output ?? undefined,
      exitCode: row.exitCode ?? undefined,
      error: row.error ?? undefined,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? undefined,
    };
  }
}
