import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  type CreateMilestoneRequest,
  type Milestone,
  type RoadmapView,
  type Task,
  type TaskSummary,
  type TeamScope,
  type UpdateMilestoneRequest,
} from '@midnite/shared';
import { AuditService } from '../audit/audit.service';
import { ProjectsService } from '../projects/projects.service';
import { milestoneToIndexDoc } from '../search/lib/index-mappers';
import { SearchIndexService } from '../search/search-index.service';
import { TasksService } from '../tasks/tasks.service';
import type { RoadmapMilestoneRow } from '../db/schema';
import { MilestonesRepository } from './milestones.repository';

/**
 * Phase 58 D — roadmap milestones. Team-scoped CRUD + full-order reorder + task
 * assignment with strict same-project validation. Progress (done/total) is
 * **computed** from the assigned tasks, never stored. Depends one-directionally on
 * ProjectsService (scope validation) + TasksService (assignment/roadmap/cleanup) —
 * neither depends back on milestones, so there's no module cycle.
 */
@Injectable()
export class MilestonesService {
  constructor(
    @Inject(MilestonesRepository) private readonly repo: MilestonesRepository,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(TasksService) private readonly tasks: TasksService,
    // Optional: global search index in prod, omitted in unit specs (mirrors ideas).
    @Optional() @Inject(SearchIndexService) private readonly searchIndex?: SearchIndexService,
    @Optional() @Inject(AuditService) private readonly audit?: AuditService,
  ) {}

  // --- reads ---

  listByProject(projectId: string, scope?: TeamScope): Milestone[] {
    this.projects.getProject(projectId, scope); // 404 if missing / out of scope
    const rows = this.repo.listByProject(projectId, scope);
    const depsByMilestone = this.repo.dependenciesByMilestoneIds(rows.map((r) => r.id));
    return rows.map((r) => this.hydrate(r, depsByMilestone.get(r.id) ?? []));
  }

  getMilestone(id: string, scope?: TeamScope): Milestone {
    const row = this.getRow(id, scope);
    return this.hydrate(row, this.repo.dependenciesOf(id));
  }

  /**
   * The project roadmap: milestones (ordered, with computed progress + their task
   * summaries) plus an unassigned backlog lane. Task summaries are the lean board
   * DTO — one query for the whole project, then bucketed by `milestoneId`. Each
   * bucket is sorted by the task's `milestonePosition` (the lane's manual
   * drag-order), tie-broken by id for a stable order before any reorder has run.
   */
  getRoadmap(projectId: string, scope?: TeamScope): RoadmapView {
    this.projects.getProject(projectId, scope); // 404 if missing / out of scope
    const milestones = this.repo.listByProject(projectId, scope);
    const depsByMilestone = this.repo.dependenciesByMilestoneIds(milestones.map((r) => r.id));
    const { items: tasks } = this.tasks.listTaskSummaries(undefined, projectId, scope);

    const byMilestone = new Map<string, TaskSummary[]>();
    const backlog: TaskSummary[] = [];
    for (const t of tasks) {
      if (t.milestoneId) {
        const list = byMilestone.get(t.milestoneId);
        if (list) list.push(t);
        else byMilestone.set(t.milestoneId, [t]);
      } else {
        backlog.push(t);
      }
    }
    for (const list of byMilestone.values()) {
      list.sort((a, b) => (a.milestonePosition ?? 0) - (b.milestonePosition ?? 0) || a.id.localeCompare(b.id));
    }

    return {
      projectId,
      milestones: milestones.map((row) => {
        const mTasks = byMilestone.get(row.id) ?? [];
        return {
          ...this.hydrate(row, depsByMilestone.get(row.id) ?? []),
          done: mTasks.filter((t) => t.status === 'done').length,
          total: mTasks.length,
          tasks: mTasks,
        };
      }),
      backlog,
    };
  }

  // --- writes ---

  create(projectId: string, req: CreateMilestoneRequest, scope?: TeamScope): Milestone {
    this.projects.getProject(projectId, scope); // 404 if missing / out of scope
    const now = new Date().toISOString();
    const row = this.repo.insert({
      id: randomUUID(),
      projectId,
      name: req.name,
      description: req.description ?? null,
      position: this.repo.nextPosition(projectId),
      targetDate: req.targetDate ?? null,
      createdAt: now,
      updatedAt: now,
      createdBy: scope?.userId ?? null,
      teamId: scope?.teamId ?? null,
    });
    // A brand-new milestone has no dependents/blockers yet.
    const milestone = this.hydrate(row, []);
    this.searchIndex?.upsert(milestoneToIndexDoc(milestone));
    this.audit?.record({ entityType: 'milestone', entityId: milestone.id, userId: scope?.userId, action: 'milestone.created' });
    return milestone;
  }

  update(id: string, req: UpdateMilestoneRequest, scope?: TeamScope): Milestone {
    this.getRow(id, scope); // 404 if missing / out of scope
    const patch: Partial<RoadmapMilestoneRow> = { updatedAt: new Date().toISOString() };
    if (req.name !== undefined) patch.name = req.name;
    if (req.description !== undefined) patch.description = req.description;
    if (req.targetDate !== undefined) patch.targetDate = req.targetDate; // null clears it

    const row = this.repo.update(id, patch);
    if (!row) throw new NotFoundException(`milestone ${id} not found`);
    const milestone = this.hydrate(row, this.repo.dependenciesOf(id));
    this.searchIndex?.upsert(milestoneToIndexDoc(milestone));
    this.audit?.record({ entityType: 'milestone', entityId: id, userId: scope?.userId, action: 'milestone.updated' });
    return milestone;
  }

  /**
   * Delete a milestone; its tasks are **unassigned** (milestoneId → null), not
   * deleted (Decision §2). The task re-broadcast lets boards drop the assignment.
   * Its dependency edges (both as a dependent and as a blocker) are cleared by
   * the repository in the same transaction as the row delete.
   */
  delete(id: string, scope?: TeamScope): void {
    this.getRow(id, scope); // 404 if missing / out of scope
    this.tasks.clearMilestone(id);
    this.repo.delete(id);
    this.searchIndex?.remove('milestone', id);
    this.audit?.record({ entityType: 'milestone', entityId: id, userId: scope?.userId, action: 'milestone.deleted' });
  }

  /**
   * Reorder a project's milestones by a full ordered id list (Decision §1). The
   * list must name every current milestone exactly once — reassigns `position`.
   */
  reorder(projectId: string, orderedIds: string[], scope?: TeamScope): Milestone[] {
    this.projects.getProject(projectId, scope); // 404 if missing / out of scope
    const current = this.repo.listByProject(projectId, scope).map((r) => r.id);
    if (!sameIdSet(current, orderedIds)) {
      throw new BadRequestException('reorder must list every current milestone exactly once');
    }
    this.repo.reorder(projectId, orderedIds, new Date().toISOString());
    return this.listByProject(projectId, scope);
  }

  /**
   * Assign (or unassign, with null) a task to a milestone. Strict: the milestone
   * must belong to the same project as the task (Decision — no cross-project pins).
   */
  assignTask(taskId: string, milestoneId: string | null, scope?: TeamScope): Task {
    if (milestoneId === null) {
      return this.tasks.setMilestone(taskId, null, scope);
    }
    const milestone = this.getRow(milestoneId, scope); // 404 if missing / out of scope
    const task = this.tasks.getTask(taskId, scope); // 404 if missing / out of scope
    if (task.projectId !== milestone.projectId) {
      throw new BadRequestException('task and milestone must belong to the same project');
    }
    return this.tasks.setMilestone(taskId, milestoneId, scope);
  }

  /**
   * Persist the manual vertical order of one milestone's roadmap-board tasks.
   * The full ordered id list must name every task currently assigned to that
   * milestone exactly once (mirrors `reorder`'s full-list contract for lanes).
   */
  reorderTasks(milestoneId: string, orderedIds: string[], scope?: TeamScope): void {
    this.getRow(milestoneId, scope); // 404 if missing / out of scope
    const current = this.tasks.listIdsForMilestone(milestoneId);
    if (!sameIdSet(current, orderedIds)) {
      throw new BadRequestException('reorder must list every task currently in this milestone exactly once');
    }
    this.tasks.reorderWithinMilestone(milestoneId, orderedIds);
  }

  /**
   * Add a "blocked by" edge: `milestoneId` depends on `dependsOnId`. Both must
   * exist and share a project (the milestone graph is always project-scoped —
   * unlike tasks, there's no cross-project "foreign" milestone concept). This
   * is also how the graph view's edges are edited: connecting two nodes calls
   * this, disconnecting calls `removeDependency`.
   */
  addDependency(milestoneId: string, dependsOnId: string, scope?: TeamScope): Milestone {
    if (milestoneId === dependsOnId) {
      throw new BadRequestException('a milestone cannot depend on itself');
    }
    const milestone = this.getRow(milestoneId, scope); // 404 if missing / out of scope
    const blocker = this.getRow(dependsOnId, scope); // 404 if missing / out of scope
    if (milestone.projectId !== blocker.projectId) {
      throw new BadRequestException('milestones must belong to the same project');
    }
    if (this.wouldCreateCycle(milestoneId, dependsOnId)) {
      throw new BadRequestException(`depending on ${dependsOnId} would create a dependency cycle`);
    }
    this.repo.addDependency(milestoneId, dependsOnId, new Date().toISOString());
    return this.getMilestone(milestoneId, scope);
  }

  /** Remove a "blocked by" edge; idempotent (a missing edge is a no-op). */
  removeDependency(milestoneId: string, dependsOnId: string, scope?: TeamScope): Milestone {
    this.getRow(milestoneId, scope); // 404 if missing / out of scope
    this.repo.removeDependency(milestoneId, dependsOnId);
    return this.getMilestone(milestoneId, scope);
  }

  // --- helpers ---

  private getRow(id: string, scope?: TeamScope): RoadmapMilestoneRow {
    const row = this.repo.getById(id, scope);
    if (!row) throw new NotFoundException(`milestone ${id} not found`);
    return row;
  }

  private hydrate(row: RoadmapMilestoneRow, dependsOn: string[]): Milestone {
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      description: row.description ?? undefined,
      position: row.position,
      targetDate: row.targetDate ?? undefined,
      dependsOn,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy ?? undefined,
      teamId: row.teamId ?? undefined,
    };
  }

  /**
   * Would adding `milestoneId → dependsOnId` create a cycle? Iterative DFS from
   * `dependsOnId` over blocker edges looking for `milestoneId` — same algorithm
   * as `TasksService.wouldCreateCycle`, scoped to milestone edges.
   */
  private wouldCreateCycle(milestoneId: string, dependsOnId: string): boolean {
    const seen = new Set<string>();
    const stack = [dependsOnId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === milestoneId) return true;
      if (seen.has(current)) continue;
      seen.add(current);
      stack.push(...this.repo.dependenciesOf(current));
    }
    return false;
  }
}

/** True when both arrays hold the same ids (ignoring order), each exactly once. */
function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}
