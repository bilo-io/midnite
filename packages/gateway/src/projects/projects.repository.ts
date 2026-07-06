import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { Project, ProjectSource, SourceKind, Status, TaskStatusCounts, TeamScope } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { teamScopeFilter } from '../db/team-scope';
import {
  projectSources,
  projects,
  roadmapMilestones,
  tasks,
  type ProjectInsert,
  type ProjectRow,
  type ProjectSourceInsert,
  type ProjectSourceRow,
} from '../db/schema';

@Injectable()
export class ProjectsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insertProject(row: ProjectInsert): ProjectRow {
    return this.db.insert(projects).values(row).returning().get();
  }

  getProject(id: string, scope?: TeamScope): ProjectRow | undefined {
    const where = scope
      ? and(eq(projects.id, id), teamScopeFilter(projects.createdBy, projects.teamId, scope))
      : eq(projects.id, id);
    return this.db.select().from(projects).where(where).get();
  }

  /**
   * Phase 58 F — the project a milestone belongs to (or undefined if unknown), for
   * the breakdown-seed same-project check. A repo-level read of the milestones
   * table so the service needn't depend on the milestones module (avoids a cycle).
   */
  milestoneProjectId(milestoneId: string): string | undefined {
    return this.db
      .select({ projectId: roadmapMilestones.projectId })
      .from(roadmapMilestones)
      .where(eq(roadmapMilestones.id, milestoneId))
      .get()?.projectId;
  }

  listProjects(scope?: TeamScope): ProjectRow[] {
    const where = scope ? teamScopeFilter(projects.createdBy, projects.teamId, scope) : undefined;
    return this.db.select().from(projects).where(where).orderBy(asc(projects.createdAt)).all();
  }

  updateProject(id: string, patch: Partial<ProjectInsert>): ProjectRow | undefined {
    return this.db
      .update(projects)
      .set(patch)
      .where(eq(projects.id, id))
      .returning()
      .get();
  }

  // Deleting a project unlinks its tasks (they survive, untagged) and removes its
  // sources. Wrapped in a transaction so the three writes are atomic.
  deleteProject(id: string): void {
    this.db.transaction((tx) => {
      tx.update(tasks).set({ projectId: null }).where(eq(tasks.projectId, id)).run();
      tx.delete(projectSources).where(eq(projectSources.projectId, id)).run();
      tx.delete(projects).where(eq(projects.id, id)).run();
    });
  }

  insertSource(row: ProjectSourceInsert): ProjectSourceRow {
    return this.db.insert(projectSources).values(row).returning().get();
  }

  listSources(projectId: string): ProjectSourceRow[] {
    return this.db
      .select()
      .from(projectSources)
      .where(eq(projectSources.projectId, projectId))
      // Explicit order first; createdAt breaks ties (e.g. legacy rows at 0).
      .orderBy(asc(projectSources.position), asc(projectSources.createdAt))
      .all();
  }

  /** Next append position for a project (max existing + 1, or 0 when empty). */
  nextSourcePosition(projectId: string): number {
    const rows = this.db
      .select({ position: projectSources.position })
      .from(projectSources)
      .where(eq(projectSources.projectId, projectId))
      .all();
    return rows.reduce((max, r) => Math.max(max, r.position), -1) + 1;
  }

  /** Persist a new order: each id's position becomes its index in the list. */
  reorderSources(projectId: string, orderedIds: string[]): void {
    this.db.transaction((tx) => {
      orderedIds.forEach((id, position) => {
        tx.update(projectSources)
          .set({ position })
          .where(and(eq(projectSources.id, id), eq(projectSources.projectId, projectId)))
          .run();
      });
    });
  }

  getSource(projectId: string, sourceId: string): ProjectSourceRow | undefined {
    return this.db
      .select()
      .from(projectSources)
      .where(and(eq(projectSources.id, sourceId), eq(projectSources.projectId, projectId)))
      .get();
  }

  deleteSource(projectId: string, sourceId: string): void {
    this.db
      .delete(projectSources)
      .where(and(eq(projectSources.id, sourceId), eq(projectSources.projectId, projectId)))
      .run();
  }

  countSources(projectId: string): number {
    const row = this.db
      .select({ c: sql<number>`COUNT(*)` })
      .from(projectSources)
      .where(eq(projectSources.projectId, projectId))
      .get();
    return Number(row?.c ?? 0);
  }

  /** Per-status task counts for one project (Phase 58 C). */
  statusCountsForProject(projectId: string): TaskStatusCounts {
    const rows = this.db
      .select({ status: tasks.status, c: sql<number>`COUNT(*)` })
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .groupBy(tasks.status)
      .all();
    const counts: TaskStatusCounts = {};
    for (const r of rows) counts[r.status as Status] = Number(r.c);
    return counts;
  }

  /**
   * Batched per-status task counts for many projects in one grouped query
   * (Phase 58 C) — avoids an N+1 across the project list. Projects with no tasks
   * are absent from the map (callers default to `{}`).
   */
  statusCountsForProjects(projectIds: string[]): Map<string, TaskStatusCounts> {
    const map = new Map<string, TaskStatusCounts>();
    if (projectIds.length === 0) return map;
    const rows = this.db
      .select({ projectId: tasks.projectId, status: tasks.status, c: sql<number>`COUNT(*)` })
      .from(tasks)
      .where(inArray(tasks.projectId, projectIds))
      .groupBy(tasks.projectId, tasks.status)
      .all();
    for (const r of rows) {
      if (!r.projectId) continue;
      const counts = map.get(r.projectId) ?? {};
      counts[r.status as Status] = Number(r.c);
      map.set(r.projectId, counts);
    }
    return map;
  }

  hydrate(row: ProjectRow, statusCounts?: TaskStatusCounts): Project {
    const counts = statusCounts ?? this.statusCountsForProject(row.id);
    const taskCount = Object.values(counts).reduce<number>((sum, n) => sum + (n ?? 0), 0);
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      tag: row.tag,
      color: row.color,
      workDir: row.workDir ?? undefined,
      plan: row.plan ?? undefined,
      planUpdatedAt: row.planUpdatedAt ?? undefined,
      archived: row.archivedAt != null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sources: this.listSources(row.id).map((s) => this.toSource(s)),
      taskCount,
      taskStatusCounts: counts,
      ideaId: row.ideaId ?? undefined,
      // null = unset (defaults on); 0 = off, 1 = on.
      phaseDocSync: row.phaseDocSync == null ? undefined : row.phaseDocSync === 1,
      phaseDocSyncRepoId: row.phaseDocSyncRepoId ?? undefined,
    };
  }

  private toSource(row: ProjectSourceRow): ProjectSource {
    return {
      id: row.id,
      projectId: row.projectId,
      url: row.url,
      kind: row.kind as SourceKind,
      title: row.title ?? undefined,
      faviconUrl: row.faviconUrl ?? undefined,
      fetchedAt: row.fetchedAt ?? undefined,
      createdAt: row.createdAt,
    };
  }
}
