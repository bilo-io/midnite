import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import type { Project, ProjectRepo, Status, TaskStatusCounts, TeamScope } from '@midnite/shared';

import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { teamScopeFilter } from '../db/team-scope';
import {
  media,
  projectRepos,
  projects,
  repos,
  roadmapMilestones,
  tasks,
  type ProjectInsert,
  type ProjectRepoRow,
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
      // Phase 84 C — drop the repo edges; the repos themselves are untouched
      // (they're a global registry, shared with other projects).
      tx.delete(projectRepos).where(eq(projectRepos.projectId, id)).run();
      tx.delete(projects).where(eq(projects.id, id)).run();
    });
  }

  // ── Project ↔ repo edges (Phase 84 Theme C) ──────────────────────────────

  /**
   * A project's attached repos, primary first then oldest-first. Joined to the
   * registry so the caller gets `name`/`path` without a second lookup; an edge
   * whose repo has since been deleted from the registry is skipped by the inner
   * join rather than surfacing as a half-populated row.
   */
  listReposForProject(projectId: string): ProjectRepo[] {
    return this.reposForProjectIds([projectId]).get(projectId) ?? [];
  }

  /**
   * Batched form for the project list — one `WHERE project_id IN (...)` instead
   * of an N+1, mirroring {@link statusCountsForProjects}. Projects with no edges
   * are absent from the map (callers default to `[]`).
   */
  reposForProjectIds(projectIds: string[]): Map<string, ProjectRepo[]> {
    const map = new Map<string, ProjectRepo[]>();
    if (projectIds.length === 0) return map;
    const rows = this.db
      .select({
        projectId: projectRepos.projectId,
        repoId: projectRepos.repoId,
        isPrimary: projectRepos.isPrimary,
        attachedAt: projectRepos.createdAt,
        name: repos.name,
        path: repos.path,
        ownerRepo: repos.ownerRepo,
      })
      .from(projectRepos)
      .innerJoin(repos, eq(repos.id, projectRepos.repoId))
      .where(inArray(projectRepos.projectId, projectIds))
      .orderBy(desc(projectRepos.isPrimary), asc(projectRepos.createdAt))
      .all();
    for (const r of rows) {
      const list = map.get(r.projectId) ?? [];
      list.push({
        repoId: r.repoId,
        name: r.name,
        path: r.path,
        isPrimary: r.isPrimary,
        ownerRepo: r.ownerRepo ?? undefined,
        attachedAt: r.attachedAt,
      });
      map.set(r.projectId, list);
    }
    return map;
  }

  /**
   * The project's **effective working directory** (Phase 84 C): the primary
   * repo's path, falling back to the stored `work_dir` when no repos are
   * attached. Both `ProjectsService` and `CwdResolverService` resolve through
   * this, so a project's directory has one definition.
   */
  effectiveWorkDirFor(projectId: string): string | undefined {
    const primary = this.db
      .select({ path: repos.path })
      .from(projectRepos)
      .innerJoin(repos, eq(repos.id, projectRepos.repoId))
      .where(and(eq(projectRepos.projectId, projectId), eq(projectRepos.isPrimary, true)))
      .get();
    return primary?.path ?? this.getProject(projectId)?.workDir ?? undefined;
  }

  /** Does this pair already have an edge? */
  findEdge(projectId: string, repoId: string): ProjectRepoRow | undefined {
    return this.db
      .select()
      .from(projectRepos)
      .where(and(eq(projectRepos.projectId, projectId), eq(projectRepos.repoId, repoId)))
      .get();
  }

  /**
   * Attach a repo, maintaining the one-primary invariant in a single
   * transaction: a project's first repo is always primary, and an explicit
   * `primary` demotes the incumbent rather than adding a second.
   */
  attachRepo(projectId: string, repoId: string, primary: boolean, now: string): void {
    this.db.transaction((tx) => {
      const existing = tx
        .select({ id: projectRepos.id })
        .from(projectRepos)
        .where(eq(projectRepos.projectId, projectId))
        .all();
      const isPrimary = primary || existing.length === 0;
      if (isPrimary) {
        tx.update(projectRepos)
          .set({ isPrimary: false })
          .where(eq(projectRepos.projectId, projectId))
          .run();
      }
      tx.insert(projectRepos)
        .values({ id: randomUUID(), projectId, repoId, isPrimary, createdAt: now })
        .run();
    });
  }

  /**
   * Detach a repo. If it was the primary, the oldest surviving edge is promoted
   * so the project never ends up with repos but no primary.
   */
  detachRepo(projectId: string, repoId: string): void {
    this.db.transaction((tx) => {
      const removed = tx
        .delete(projectRepos)
        .where(and(eq(projectRepos.projectId, projectId), eq(projectRepos.repoId, repoId)))
        .returning()
        .get();
      if (!removed?.isPrimary) return;
      const next = tx
        .select({ id: projectRepos.id })
        .from(projectRepos)
        .where(eq(projectRepos.projectId, projectId))
        .orderBy(asc(projectRepos.createdAt))
        .get();
      if (next) tx.update(projectRepos).set({ isPrimary: true }).where(eq(projectRepos.id, next.id)).run();
    });
  }

  /** Promote one edge to primary, demoting the incumbent in the same transaction. */
  setPrimaryRepo(projectId: string, repoId: string): void {
    this.db.transaction((tx) => {
      tx.update(projectRepos)
        .set({ isPrimary: false })
        .where(eq(projectRepos.projectId, projectId))
        .run();
      tx.update(projectRepos)
        .set({ isPrimary: true })
        .where(and(eq(projectRepos.projectId, projectId), eq(projectRepos.repoId, repoId)))
        .run();
    });
  }

  /**
   * Drop every edge pointing at a repo that's being removed from the registry,
   * promoting a successor in each project that loses its primary.
   */
  clearEdgesForRepo(repoId: string): void {
    const affected = this.db
      .select({ projectId: projectRepos.projectId })
      .from(projectRepos)
      .where(eq(projectRepos.repoId, repoId))
      .all();
    for (const { projectId } of affected) this.detachRepo(projectId, repoId);
  }

  /** Projects that carry no repo edges at all — the backfill's candidate set. */
  listProjectsWithoutRepos(): ProjectRow[] {
    const linked = this.db.selectDistinct({ projectId: projectRepos.projectId }).from(projectRepos).all();
    const ids = linked.map((r) => r.projectId);
    const rows = this.db.select().from(projects).all();
    const linkedIds = new Set(ids);
    return rows.filter((r) => !linkedIds.has(r.id));
  }

  /** Every registered repo, for the backfill's path matching. */
  listAllRepos(): Array<{ id: string; path: string }> {
    return this.db.select({ id: repos.id, path: repos.path }).from(repos).all();
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

  hydrate(row: ProjectRow, statusCounts?: TaskStatusCounts, projectRepoList?: ProjectRepo[]): Project {
    const counts = statusCounts ?? this.statusCountsForProject(row.id);
    const attachedRepos = projectRepoList ?? this.listReposForProject(row.id);
    const taskCount = Object.values(counts).reduce<number>((sum, n) => sum + (n ?? 0), 0);
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      tag: row.tag,
      color: row.color,
      workDir: row.workDir ?? undefined,
      startCommand: row.startCommand ?? undefined,
      buildCommand: row.buildCommand ?? undefined,
      plan: row.plan ?? undefined,
      planUpdatedAt: row.planUpdatedAt ?? undefined,
      archived: row.archivedAt != null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      taskCount,
      taskStatusCounts: counts,
      repos: attachedRepos,
    };
  }
}
