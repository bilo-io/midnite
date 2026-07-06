import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import type { TeamScope } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { teamScopeFilter } from '../db/team-scope';
import {
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

  delete(id: string): void {
    this.db.delete(roadmapMilestones).where(eq(roadmapMilestones.id, id)).run();
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
}
