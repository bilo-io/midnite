import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type {
  AgentCli,
  Council,
  CouncilParticipant,
  CouncilParticipantRunStatus,
  CouncilRun,
  CouncilRunParticipant,
  CouncilRunStatus,
} from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  councilParticipants,
  councilRunParticipants,
  councilRuns,
  councils,
  type CouncilInsert,
  type CouncilParticipantInsert,
  type CouncilParticipantRow,
  type CouncilRow,
  type CouncilRunInsert,
  type CouncilRunParticipantInsert,
  type CouncilRunParticipantRow,
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

  /** Remove a council and its participants. Run history is deleted with it. */
  deleteCouncil(id: string): void {
    this.db.transaction((tx) => {
      const runs = tx.select().from(councilRuns).where(eq(councilRuns.councilId, id)).all();
      for (const run of runs) {
        tx.delete(councilRunParticipants).where(eq(councilRunParticipants.runId, run.id)).run();
      }
      tx.delete(councilRuns).where(eq(councilRuns.councilId, id)).run();
      tx.delete(councilParticipants).where(eq(councilParticipants.councilId, id)).run();
      tx.delete(councils).where(eq(councils.id, id)).run();
    });
  }

  // ---- participants ----

  listParticipants(councilId: string): CouncilParticipantRow[] {
    return this.db
      .select()
      .from(councilParticipants)
      .where(eq(councilParticipants.councilId, councilId))
      // Explicit order first; createdAt breaks ties (e.g. legacy rows at 0).
      .orderBy(asc(councilParticipants.position), asc(councilParticipants.createdAt))
      .all();
  }

  /** Next append position for a council (max existing + 1, or 0 when empty). */
  nextParticipantPosition(councilId: string): number {
    const rows = this.db
      .select({ position: councilParticipants.position })
      .from(councilParticipants)
      .where(eq(councilParticipants.councilId, councilId))
      .all();
    return rows.reduce((max, r) => Math.max(max, r.position), -1) + 1;
  }

  /** Persist a new order: each id's position becomes its index in the list. */
  reorderParticipants(councilId: string, orderedIds: string[]): void {
    this.db.transaction((tx) => {
      orderedIds.forEach((id, position) => {
        tx.update(councilParticipants)
          .set({ position })
          .where(and(eq(councilParticipants.id, id), eq(councilParticipants.councilId, councilId)))
          .run();
      });
    });
  }

  getParticipant(id: string): CouncilParticipantRow | undefined {
    return this.db.select().from(councilParticipants).where(eq(councilParticipants.id, id)).get();
  }

  insertParticipant(row: CouncilParticipantInsert): CouncilParticipantRow {
    return this.db.insert(councilParticipants).values(row).returning().get();
  }

  updateParticipant(
    id: string,
    patch: Partial<CouncilParticipantInsert>,
  ): CouncilParticipantRow | undefined {
    return this.db
      .update(councilParticipants)
      .set(patch)
      .where(eq(councilParticipants.id, id))
      .returning()
      .get();
  }

  deleteParticipant(id: string): void {
    this.db.delete(councilParticipants).where(eq(councilParticipants.id, id)).run();
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

  listRunParticipants(runId: string): CouncilRunParticipantRow[] {
    return this.db
      .select()
      .from(councilRunParticipants)
      // Insertion order = the participant order snapshotted at run start, which
      // drives the tab order. Stable across retries (those reset startedAt).
      .where(eq(councilRunParticipants.runId, runId))
      .orderBy(asc(sql`rowid`))
      .all();
  }

  insertRunParticipant(row: CouncilRunParticipantInsert): CouncilRunParticipantRow {
    return this.db.insert(councilRunParticipants).values(row).returning().get();
  }

  updateRunParticipant(
    id: string,
    patch: Partial<CouncilRunParticipantInsert>,
  ): CouncilRunParticipantRow | undefined {
    return this.db
      .update(councilRunParticipants)
      .set(patch)
      .where(eq(councilRunParticipants.id, id))
      .returning()
      .get();
  }

  // ---- hydration (DB row → API type) ----

  hydrateCouncil(row: CouncilRow): Council {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      verdictProvider: row.verdictProvider as AgentCli,
      participants: this.listParticipants(row.id).map((p) => this.hydrateParticipant(p)),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  hydrateParticipant(row: CouncilParticipantRow): CouncilParticipant {
    return {
      id: row.id,
      councilId: row.councilId,
      name: row.name,
      provider: row.provider as AgentCli,
      perspective: row.perspective,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  hydrateRun(row: CouncilRunRow): CouncilRun {
    return {
      id: row.id,
      councilId: row.councilId,
      topic: row.topic,
      status: row.status as CouncilRunStatus,
      verdictProvider: (row.verdictProvider as AgentCli | null) ?? undefined,
      // Deterministic attach id; the PTY behind it only exists while synthesizing.
      verdictTerminalId: `council-${row.id}-verdict`,
      verdict: row.verdict ?? undefined,
      error: row.error ?? undefined,
      participants: this.listRunParticipants(row.id).map((p) => this.hydrateRunParticipant(p)),
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? undefined,
    };
  }

  hydrateRunParticipant(row: CouncilRunParticipantRow): CouncilRunParticipant {
    return {
      id: row.id,
      runId: row.runId,
      participantId: row.participantId,
      name: row.name,
      provider: row.provider as AgentCli,
      perspective: row.perspective,
      status: row.status as CouncilParticipantRunStatus,
      terminalId: row.terminalId,
      output: row.output ?? undefined,
      exitCode: row.exitCode ?? undefined,
      error: row.error ?? undefined,
      label: row.label ?? undefined,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? undefined,
    };
  }
}
