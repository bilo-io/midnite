import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Project, ProjectSource, SourceKind } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  projectSources,
  projects,
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

  getProject(id: string): ProjectRow | undefined {
    return this.db.select().from(projects).where(eq(projects.id, id)).get();
  }

  listProjects(): ProjectRow[] {
    return this.db.select().from(projects).orderBy(asc(projects.createdAt)).all();
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

  countTasks(projectId: string): number {
    const row = this.db
      .select({ c: sql<number>`COUNT(*)` })
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .get();
    return Number(row?.c ?? 0);
  }

  hydrate(row: ProjectRow): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      tag: row.tag,
      color: row.color,
      workDir: row.workDir ?? undefined,
      plan: row.plan ?? undefined,
      planUpdatedAt: row.planUpdatedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sources: this.listSources(row.id).map((s) => this.toSource(s)),
      taskCount: this.countTasks(row.id),
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
