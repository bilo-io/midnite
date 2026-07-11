import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { Project, Status, TaskStatusCounts, TeamScope } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { teamScopeFilter } from '../db/team-scope';
import {
  media,
  projects,
  roadmapMilestones,
  tasks,
  type ProjectInsert,
  type ProjectRow,
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

  /**
   * A page of project rows (Phase 57 C follow-up). `total` is a `COUNT(*)` over
   * the same scoped filter; `limit`/`offset` apply only when `limit` is set
   * (omitted = every row). Mirrors `TasksRepository.listTaskPage`.
   */
  listProjectPage(
    scope?: TeamScope,
    opts?: { page?: number; limit?: number },
  ): { rows: ProjectRow[]; total: number } {
    const where = scope ? teamScopeFilter(projects.createdBy, projects.teamId, scope) : undefined;
    const total = Number(
      this.db.select({ count: sql<number>`COUNT(*)` }).from(projects).where(where).get()?.count ?? 0,
    );
    const ordered = this.db.select().from(projects).where(where).orderBy(asc(projects.createdAt));
    const rows =
      opts?.limit != null
        ? ordered.limit(opts.limit).offset(((opts.page ?? 1) - 1) * opts.limit).all()
        : ordered.all();
    return { rows, total };
  }

  updateProject(id: string, patch: Partial<ProjectInsert>): ProjectRow | undefined {
    return this.db
      .update(projects)
      .set(patch)
      .where(eq(projects.id, id))
      .returning()
      .get();
  }

  // Deleting a project cascade-cleans every cross-domain ref that pointed at it
  // (no schema FKs, so this is the app-layer invariant — Phase 60 F). Tasks and
  // media survive but unlinked; the project's milestones are removed and their
  // tasks' `milestoneId` cleared (so no task keeps a phantom milestone chip for a
  // gone project). All atomic in one transaction.
  deleteProject(id: string): void {
    this.db.transaction((tx) => {
      // Unlink tasks: drop both the project tag AND any (same-project) milestone.
      tx.update(tasks).set({ projectId: null, milestoneId: null }).where(eq(tasks.projectId, id)).run();
      // Unlink media that lived under the project (else it's stranded — unreachable
      // via the project gallery, never GC'd).
      tx.update(media).set({ projectId: null }).where(eq(media.projectId, id)).run();
      // Remove the project's milestones (their tasks were just un-assigned above).
      tx.delete(roadmapMilestones).where(eq(roadmapMilestones.projectId, id)).run();
      tx.delete(projects).where(eq(projects.id, id)).run();
    });
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
      taskCount,
      taskStatusCounts: counts,
      ideaId: row.ideaId ?? undefined,
      // null = unset (defaults on); 0 = off, 1 = on.
      phaseDocSync: row.phaseDocSync == null ? undefined : row.phaseDocSync === 1,
      phaseDocSyncRepoId: row.phaseDocSyncRepoId ?? undefined,
    };
  }
}
