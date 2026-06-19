import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type {
  AgentCli,
  Brainstorm,
  BrainstormContributor,
  BrainstormContributorRunStatus,
  BrainstormRun,
  BrainstormRunContributor,
  BrainstormRunStatus,
  BrainstormSynthesisEntry,
  BrainstormSynthMode,
} from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  brainstormContributors,
  brainstormRunContributors,
  brainstormRuns,
  brainstorms,
  type BrainstormContributorInsert,
  type BrainstormContributorRow,
  type BrainstormInsert,
  type BrainstormRow,
  type BrainstormRunContributorInsert,
  type BrainstormRunContributorRow,
  type BrainstormRunInsert,
  type BrainstormRunRow,
} from '../db/schema';

@Injectable()
export class BrainstormsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  // ---- brainstorms ----

  listBrainstorms(): BrainstormRow[] {
    return this.db.select().from(brainstorms).orderBy(desc(brainstorms.createdAt)).all();
  }

  getBrainstorm(id: string): BrainstormRow | undefined {
    return this.db.select().from(brainstorms).where(eq(brainstorms.id, id)).get();
  }

  insertBrainstorm(row: BrainstormInsert): BrainstormRow {
    return this.db.insert(brainstorms).values(row).returning().get();
  }

  updateBrainstorm(id: string, patch: Partial<BrainstormInsert>): BrainstormRow | undefined {
    return this.db.update(brainstorms).set(patch).where(eq(brainstorms.id, id)).returning().get();
  }

  /** Remove a brainstorm and its contributors. Run history is deleted with it. */
  deleteBrainstorm(id: string): void {
    this.db.transaction((tx) => {
      const runs = tx.select().from(brainstormRuns).where(eq(brainstormRuns.brainstormId, id)).all();
      for (const run of runs) {
        tx.delete(brainstormRunContributors)
          .where(eq(brainstormRunContributors.runId, run.id))
          .run();
      }
      tx.delete(brainstormRuns).where(eq(brainstormRuns.brainstormId, id)).run();
      tx.delete(brainstormContributors).where(eq(brainstormContributors.brainstormId, id)).run();
      tx.delete(brainstorms).where(eq(brainstorms.id, id)).run();
    });
  }

  // ---- contributors ----

  listContributors(brainstormId: string): BrainstormContributorRow[] {
    return this.db
      .select()
      .from(brainstormContributors)
      .where(eq(brainstormContributors.brainstormId, brainstormId))
      // Explicit order first; createdAt breaks ties (e.g. legacy rows at 0).
      .orderBy(asc(brainstormContributors.position), asc(brainstormContributors.createdAt))
      .all();
  }

  /** Next append position for a brainstorm (max existing + 1, or 0 when empty). */
  nextContributorPosition(brainstormId: string): number {
    const rows = this.db
      .select({ position: brainstormContributors.position })
      .from(brainstormContributors)
      .where(eq(brainstormContributors.brainstormId, brainstormId))
      .all();
    return rows.reduce((max, r) => Math.max(max, r.position), -1) + 1;
  }

  /** Persist a new order: each id's position becomes its index in the list. */
  reorderContributors(brainstormId: string, orderedIds: string[]): void {
    this.db.transaction((tx) => {
      orderedIds.forEach((id, position) => {
        tx.update(brainstormContributors)
          .set({ position })
          .where(
            and(
              eq(brainstormContributors.id, id),
              eq(brainstormContributors.brainstormId, brainstormId),
            ),
          )
          .run();
      });
    });
  }

  getContributor(id: string): BrainstormContributorRow | undefined {
    return this.db
      .select()
      .from(brainstormContributors)
      .where(eq(brainstormContributors.id, id))
      .get();
  }

  insertContributor(row: BrainstormContributorInsert): BrainstormContributorRow {
    return this.db.insert(brainstormContributors).values(row).returning().get();
  }

  updateContributor(
    id: string,
    patch: Partial<BrainstormContributorInsert>,
  ): BrainstormContributorRow | undefined {
    return this.db
      .update(brainstormContributors)
      .set(patch)
      .where(eq(brainstormContributors.id, id))
      .returning()
      .get();
  }

  deleteContributor(id: string): void {
    this.db.delete(brainstormContributors).where(eq(brainstormContributors.id, id)).run();
  }

  // ---- runs ----

  listRuns(brainstormId: string): BrainstormRunRow[] {
    return this.db
      .select()
      .from(brainstormRuns)
      .where(eq(brainstormRuns.brainstormId, brainstormId))
      .orderBy(desc(brainstormRuns.startedAt))
      .all();
  }

  getRun(id: string): BrainstormRunRow | undefined {
    return this.db.select().from(brainstormRuns).where(eq(brainstormRuns.id, id)).get();
  }

  listStaleRuns(): BrainstormRunRow[] {
    return this.db
      .select()
      .from(brainstormRuns)
      .all()
      .filter((r) => r.status === 'running' || r.status === 'synthesizing');
  }

  insertRun(row: BrainstormRunInsert): BrainstormRunRow {
    return this.db.insert(brainstormRuns).values(row).returning().get();
  }

  updateRun(id: string, patch: Partial<BrainstormRunInsert>): BrainstormRunRow | undefined {
    return this.db
      .update(brainstormRuns)
      .set(patch)
      .where(eq(brainstormRuns.id, id))
      .returning()
      .get();
  }

  listRunContributors(runId: string): BrainstormRunContributorRow[] {
    return this.db
      .select()
      .from(brainstormRunContributors)
      // Insertion order = the contributor order snapshotted at run start, which
      // drives the tab order. Stable across retries (those reset startedAt).
      .where(eq(brainstormRunContributors.runId, runId))
      .orderBy(asc(sql`rowid`))
      .all();
  }

  insertRunContributor(row: BrainstormRunContributorInsert): BrainstormRunContributorRow {
    return this.db.insert(brainstormRunContributors).values(row).returning().get();
  }

  updateRunContributor(
    id: string,
    patch: Partial<BrainstormRunContributorInsert>,
  ): BrainstormRunContributorRow | undefined {
    return this.db
      .update(brainstormRunContributors)
      .set(patch)
      .where(eq(brainstormRunContributors.id, id))
      .returning()
      .get();
  }

  private parseSyntheses(json: string | null): BrainstormSynthesisEntry[] {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? (parsed as BrainstormSynthesisEntry[]) : [];
    } catch {
      return [];
    }
  }

  /**
   * Upsert a completed synthesis for `entry.mode` (keeping its position so chip
   * order is stable), so re-synthesizing in a new mode accumulates an archive
   * rather than overwriting the previous one.
   */
  recordSynthesis(runId: string, entry: BrainstormSynthesisEntry): void {
    const row = this.getRun(runId);
    if (!row) return;
    const list = this.parseSyntheses(row.syntheses);
    const idx = list.findIndex((e) => e.mode === entry.mode);
    const next = idx >= 0 ? list.map((e, i) => (i === idx ? entry : e)) : [...list, entry];
    this.updateRun(runId, { syntheses: JSON.stringify(next) });
  }

  // ---- hydration (DB row → API type) ----

  hydrateBrainstorm(row: BrainstormRow): Brainstorm {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      synthProvider: row.synthProvider as AgentCli,
      defaultMode: row.defaultMode as BrainstormSynthMode,
      contributors: this.listContributors(row.id).map((c) => this.hydrateContributor(c)),
      archived: row.archivedAt != null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  hydrateContributor(row: BrainstormContributorRow): BrainstormContributor {
    return {
      id: row.id,
      brainstormId: row.brainstormId,
      name: row.name,
      provider: row.provider as AgentCli,
      lens: row.lens,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  hydrateRun(row: BrainstormRunRow): BrainstormRun {
    return {
      id: row.id,
      brainstormId: row.brainstormId,
      prompt: row.prompt,
      mode: row.mode as BrainstormSynthMode,
      status: row.status as BrainstormRunStatus,
      synthProvider: (row.synthProvider as AgentCli | null) ?? undefined,
      // Deterministic attach id; the PTY behind it only exists while synthesizing.
      synthTerminalId: `brainstorm-${row.id}-synth`,
      synthesis: row.synthesis ?? undefined,
      syntheses: this.parseSyntheses(row.syntheses),
      error: row.error ?? undefined,
      contributors: this.listRunContributors(row.id).map((c) => this.hydrateRunContributor(c)),
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? undefined,
    };
  }

  hydrateRunContributor(row: BrainstormRunContributorRow): BrainstormRunContributor {
    return {
      id: row.id,
      runId: row.runId,
      contributorId: row.contributorId,
      name: row.name,
      provider: row.provider as AgentCli,
      lens: row.lens,
      status: row.status as BrainstormContributorRunStatus,
      terminalId: row.terminalId,
      output: row.output ?? undefined,
      exitCode: row.exitCode ?? undefined,
      error: row.error ?? undefined,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? undefined,
    };
  }
}
