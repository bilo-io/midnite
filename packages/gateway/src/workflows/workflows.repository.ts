import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import {
  TriggerSchema,
  WorkflowGraphSchema,
  type NodeRun,
  type TeamScope,
  type Trigger,
  type Workflow,
  type WorkflowRun,
} from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { teamScopeFilter } from '../db/team-scope';
import {
  nodeRuns,
  workflowRuns,
  workflows,
  type NodeRunInsert,
  type NodeRunRow,
  type WorkflowInsert,
  type WorkflowRow,
  type WorkflowRunInsert,
  type WorkflowRunRow,
} from '../db/schema';

/** Max workflow ids per `IN (…)` batch — under SQLite's bound-parameter ceiling. */
const RUN_ID_CHUNK = 500;

@Injectable()
export class WorkflowsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  // --- workflows ---

  insertWorkflow(row: WorkflowInsert): WorkflowRow {
    return this.db.insert(workflows).values(row).returning().get();
  }

  getWorkflowRow(id: string, scope?: TeamScope): WorkflowRow | undefined {
    const where = scope
      ? and(eq(workflows.id, id), teamScopeFilter(workflows.createdBy, workflows.teamId, scope))
      : eq(workflows.id, id);
    return this.db.select().from(workflows).where(where).get();
  }

  listWorkflowRows(scope?: TeamScope): WorkflowRow[] {
    const where = scope ? teamScopeFilter(workflows.createdBy, workflows.teamId, scope) : undefined;
    return this.db.select().from(workflows).where(where).orderBy(desc(workflows.updatedAt)).all();
  }

  listScheduledEnabledRows(): WorkflowRow[] {
    return this.db
      .select()
      .from(workflows)
      .where(and(eq(workflows.enabled, 1), eq(workflows.triggerType, 'schedule')))
      .all();
  }

  updateWorkflowRow(id: string, patch: Partial<WorkflowInsert>): WorkflowRow | undefined {
    return this.db.update(workflows).set(patch).where(eq(workflows.id, id)).returning().get();
  }

  setLastFiredAt(id: string, at: string): void {
    this.db.update(workflows).set({ lastFiredAt: at }).where(eq(workflows.id, id)).run();
  }

  deleteWorkflow(id: string): void {
    this.db.transaction((tx) => {
      const runs = tx
        .select({ id: workflowRuns.id })
        .from(workflowRuns)
        .where(eq(workflowRuns.workflowId, id))
        .all();
      for (const r of runs) {
        tx.delete(nodeRuns).where(eq(nodeRuns.runId, r.id)).run();
      }
      tx.delete(workflowRuns).where(eq(workflowRuns.workflowId, id)).run();
      tx.delete(workflows).where(eq(workflows.id, id)).run();
    });
  }

  // --- runs ---

  createRun(row: WorkflowRunInsert): void {
    this.db.insert(workflowRuns).values(row).run();
  }

  finishRun(id: string, patch: Partial<WorkflowRunInsert>): void {
    this.db.update(workflowRuns).set(patch).where(eq(workflowRuns.id, id)).run();
  }

  getRunRow(id: string): WorkflowRunRow | undefined {
    return this.db.select().from(workflowRuns).where(eq(workflowRuns.id, id)).get();
  }

  listRunRows(workflowId: string): WorkflowRunRow[] {
    return this.db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.workflowId, workflowId))
      .orderBy(desc(workflowRuns.startedAt))
      .all();
  }

  latestRunRow(workflowId: string): WorkflowRunRow | undefined {
    return this.db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.workflowId, workflowId))
      .orderBy(desc(workflowRuns.startedAt))
      .limit(1)
      .get();
  }

  /**
   * Latest run per workflow for a page of ids — the batched form of
   * {@link latestRunRow} that kills the `listSummaries` N+1 (Phase 57 B). One
   * query over all ids ordered `startedAt` ascending; the last row seen per
   * workflow is its newest (last-wins), matching `latestRunRow`'s `desc … limit 1`.
   */
  latestRunRowsByWorkflowIds(ids: string[]): Map<string, WorkflowRunRow> {
    const map = new Map<string, WorkflowRunRow>();
    // Chunk under SQLite's bound-parameter ceiling (see ID_CHUNK in tasks.repository).
    for (let i = 0; i < ids.length; i += RUN_ID_CHUNK) {
      const batch = ids.slice(i, i + RUN_ID_CHUNK);
      const rows = this.db
        .select()
        .from(workflowRuns)
        .where(inArray(workflowRuns.workflowId, batch))
        .orderBy(asc(workflowRuns.startedAt))
        .all();
      for (const r of rows) map.set(r.workflowId, r);
    }
    return map;
  }

  /** All runs still marked `running` across every workflow — orphaned after a
   *  crash/restart (runs execute in-process, so there's no process to resume). */
  listRunningRunRows(): WorkflowRunRow[] {
    return this.db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.status, 'running'))
      .orderBy(desc(workflowRuns.startedAt))
      .all();
  }

  // --- node runs ---

  createNodeRun(row: NodeRunInsert): void {
    this.db.insert(nodeRuns).values(row).run();
  }

  updateNodeRun(runId: string, nodeId: string, patch: Partial<NodeRunInsert>): void {
    this.db
      .update(nodeRuns)
      .set(patch)
      .where(and(eq(nodeRuns.runId, runId), eq(nodeRuns.nodeId, nodeId)))
      .run();
  }

  skipPendingNodeRuns(runId: string): void {
    this.db
      .update(nodeRuns)
      .set({ status: 'skipped', finishedAt: new Date().toISOString() })
      .where(and(eq(nodeRuns.runId, runId), eq(nodeRuns.status, 'pending')))
      .run();
  }

  /** Mark a run's still-`running` node-runs failed — used by boot recovery when
   *  the owning run is reconciled as a stale orphan. */
  failRunningNodeRuns(runId: string, error: string, finishedAt: string): void {
    this.db
      .update(nodeRuns)
      .set({ status: 'failed', error, finishedAt })
      .where(and(eq(nodeRuns.runId, runId), eq(nodeRuns.status, 'running')))
      .run();
  }

  listNodeRunRows(runId: string): NodeRunRow[] {
    return this.db.select().from(nodeRuns).where(eq(nodeRuns.runId, runId)).all();
  }

  // --- hydration ---

  hydrateWorkflow(row: WorkflowRow): Workflow {
    const graph = WorkflowGraphSchema.parse(JSON.parse(row.graph));
    const trigger: Trigger = TriggerSchema.parse(JSON.parse(row.trigger));
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      enabled: row.enabled === 1,
      trigger,
      nodes: graph.nodes,
      edges: graph.edges,
      archived: row.archivedAt != null,
      installedFromTemplateId: row.installedFromTemplateId ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy ?? undefined,
    };
  }

  hydrateNodeRun(row: NodeRunRow): NodeRun {
    return {
      id: row.id,
      runId: row.runId,
      nodeId: row.nodeId,
      nodeType: row.nodeType,
      status: row.status as NodeRun['status'],
      input: row.input ? (JSON.parse(row.input) as unknown) : undefined,
      resolvedParams: row.resolvedParams ? (JSON.parse(row.resolvedParams) as unknown) : undefined,
      output: row.output ? (JSON.parse(row.output) as unknown) : undefined,
      error: row.error ?? undefined,
      logs: row.logs ? (JSON.parse(row.logs) as NodeRun['logs']) : [],
      startedAt: row.startedAt ?? undefined,
      finishedAt: row.finishedAt ?? undefined,
    };
  }

  hydrateRun(row: WorkflowRunRow, includeNodeRuns: boolean): WorkflowRun {
    return {
      id: row.id,
      workflowId: row.workflowId,
      status: row.status as WorkflowRun['status'],
      triggerSource: row.triggerSource as WorkflowRun['triggerSource'],
      input: row.input ? (JSON.parse(row.input) as unknown) : undefined,
      error: row.error ?? undefined,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? undefined,
      nodeRuns: includeNodeRuns
        ? this.listNodeRunRows(row.id).map((r) => this.hydrateNodeRun(r))
        : [],
    };
  }

  /** Run with node-runs, scoped to a workflow (404-safe by returning undefined). */
  getRun(workflowId: string, runId: string): WorkflowRun | undefined {
    const row = this.getRunRow(runId);
    if (!row || row.workflowId !== workflowId) return undefined;
    return this.hydrateRun(row, true);
  }
}
