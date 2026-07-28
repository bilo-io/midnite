import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, or } from 'drizzle-orm';
import type { TeamScope } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { teamScopeFilter } from '../db/team-scope';
import {
  milestoneDependencies,
  roadmapMilestones,
  type RoadmapMilestoneInsert,
  type RoadmapMilestoneRow,
} from '../db/schema';

/** Drizzle-only data access for roadmap milestones (Phase 58 D). Team-scoped
 *  reads mirror every other domain (`teamScopeFilter`). */
@Injectable()
export class MilestonesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: RoadmapMilestoneInsert): RoadmapMilestoneRow {
    return this.db.insert(roadmapMilestones).values(row).returning().get();
  }

  getById(id: string, scope?: TeamScope): RoadmapMilestoneRow | undefined {
    const where = scope
      ? and(
          eq(roadmapMilestones.id, id),
          teamScopeFilter(roadmapMilestones.createdBy, roadmapMilestones.teamId, scope),
        )
      : eq(roadmapMilestones.id, id);
    return this.db.select().from(roadmapMilestones).where(where).get();
  }

  listByProject(projectId: string, scope?: TeamScope): RoadmapMilestoneRow[] {
    const where = and(
      eq(roadmapMilestones.projectId, projectId),
      scope ? teamScopeFilter(roadmapMilestones.createdBy, roadmapMilestones.teamId, scope) : undefined,
    );
    return this.db
      .select()
      .from(roadmapMilestones)
      .where(where)
      // Explicit order first; createdAt breaks ties (e.g. rows at position 0).
      .orderBy(asc(roadmapMilestones.position), asc(roadmapMilestones.createdAt))
      .all();
  }

  /** Next free `position` for a project (append to the end). */
  nextPosition(projectId: string): number {
    const rows = this.db
      .select({ position: roadmapMilestones.position })
      .from(roadmapMilestones)
      .where(eq(roadmapMilestones.projectId, projectId))
      .all();
    return rows.reduce((max, r) => Math.max(max, r.position + 1), 0);
  }

  update(id: string, patch: Partial<RoadmapMilestoneInsert>): RoadmapMilestoneRow | undefined {
    return this.db
      .update(roadmapMilestones)
      .set(patch)
      .where(eq(roadmapMilestones.id, id))
      .returning()
      .get();
  }

  // Deleting a milestone also clears its dependency edges in *both* directions
  // (as a dependent — its own blockers — and as a blocker — whatever depended
  // on it, which become unblocked), mirroring `TasksRepository.deleteTask`.
  // Wrapped in a transaction so the writes are atomic.
  delete(id: string): void {
    this.db.transaction((tx) => {
      tx.delete(milestoneDependencies)
        .where(or(eq(milestoneDependencies.milestoneId, id), eq(milestoneDependencies.dependsOnMilestoneId, id)))
        .run();
      tx.delete(roadmapMilestones).where(eq(roadmapMilestones.id, id)).run();
    });
  }

  /** Reassign `position` 0..n-1 from the given order, scoped to the project so a
   *  stray id from another project can't be reordered in. Atomic. */
  reorder(projectId: string, orderedIds: string[], updatedAt: string): void {
    this.db.transaction((tx) => {
      orderedIds.forEach((id, position) => {
        tx.update(roadmapMilestones)
          .set({ position, updatedAt })
          .where(and(eq(roadmapMilestones.id, id), eq(roadmapMilestones.projectId, projectId)))
          .run();
      });
    });
  }

  // ---- dependency edges (milestone "blocked by" graph) ----

  /** Add a blocker edge `milestoneId → dependsOnMilestoneId`; a duplicate pair is a no-op. */
  addDependency(milestoneId: string, dependsOnMilestoneId: string, createdAt: string): void {
    this.db
      .insert(milestoneDependencies)
      .values({ milestoneId, dependsOnMilestoneId, createdAt })
      .onConflictDoNothing()
      .run();
  }

  removeDependency(milestoneId: string, dependsOnMilestoneId: string): void {
    this.db
      .delete(milestoneDependencies)
      .where(
        and(
          eq(milestoneDependencies.milestoneId, milestoneId),
          eq(milestoneDependencies.dependsOnMilestoneId, dependsOnMilestoneId),
        ),
      )
      .run();
  }

  /** Ids of the milestones that block `milestoneId` (its blockers). */
  dependenciesOf(milestoneId: string): string[] {
    return this.db
      .select({ id: milestoneDependencies.dependsOnMilestoneId })
      .from(milestoneDependencies)
      .where(eq(milestoneDependencies.milestoneId, milestoneId))
      .all()
      .map((r) => r.id);
  }

  /** Blocker ids (`dependsOn`) keyed by milestoneId — a project's milestone
   *  count is always small, so this is one unbatched query (no id-cap chunking,
   *  unlike the equivalent task-dependency bulk lookup). */
  dependenciesByMilestoneIds(ids: string[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    if (ids.length === 0) return map;
    const rows = this.db
      .select({ milestoneId: milestoneDependencies.milestoneId, dependsOn: milestoneDependencies.dependsOnMilestoneId })
      .from(milestoneDependencies)
      .where(inArray(milestoneDependencies.milestoneId, ids))
      .all();
    for (const r of rows) {
      const list = map.get(r.milestoneId);
      if (list) list.push(r.dependsOn);
      else map.set(r.milestoneId, [r.dependsOn]);
    }
    return map;
  }
}
