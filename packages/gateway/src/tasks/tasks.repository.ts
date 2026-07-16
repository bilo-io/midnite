import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, notInArray, or, sql } from 'drizzle-orm';
import {
  ANSWER_EVENT_KIND,
  detectSourceKind,
  type CheckResult,
  type CheckRun,
  type CheckRunStatus,
  type CheckTrigger,
  type PrStatus,
  type Status,
  type Task,
  type TaskAttachment,
  type TaskEvent,
  type TaskActivityEntry,
  type TaskLink,
  type TaskSummary,
  type TeamScope,
  type WaitReason,
} from '@midnite/shared';
import { teamScopeFilter } from '../db/team-scope';
import { DB_TOKEN, type DbOrTx, type MidniteDb, type Tx } from '../db/db.module';
import {
  prStatus,
  roadmapMilestones,
  taskAttachments,
  taskCheckRuns,
  taskDependencies,
  taskEvents,
  taskLinks,
  tasks,
  type PrStatusInsert,
  type PrStatusRow,
  type TaskAttachmentInsert,
  type TaskCheckRunInsert,
  type TaskEventInsert,
  type TaskLinkInsert,
  type TaskInsert,
  type TaskRow,
} from '../db/schema';

function checkRunRowToCheckRun(row: {
  id: string;
  taskId: string;
  trigger: string;
  passed: number;
  startedAt: string;
  finishedAt: string;
  results: string;
}): CheckRun {
  return {
    id: row.id,
    taskId: row.taskId,
    trigger: row.trigger as CheckTrigger,
    passed: row.passed === 1,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    results: JSON.parse(row.results) as CheckResult[],
  };
}

/**
 * Max id count per `WHERE taskId IN (…)` batch. SQLite caps bound parameters
 * (`SQLITE_MAX_VARIABLE_NUMBER`, historically 999), so `hydrateMany` chunks the
 * id list under this ceiling and merges — safe for an unpaginated board until
 * Phase 57 C's keyset pagination lands. Each task's id lands in exactly one
 * chunk, so per-task relation ordering is preserved.
 */
const ID_CHUNK = 500;

/** Split `ids` into consecutive batches of at most {@link ID_CHUNK}. */
function chunkIds(ids: readonly string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) out.push(ids.slice(i, i + ID_CHUNK));
  return out;
}

/** Append `value` to the list at `key`, creating it on first use. */
function pushGroup<V>(map: Map<string, V[]>, key: string, value: V): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

// Pure row→shape mappers, shared by the single-row (`hydrate`) and batched
// (`hydrateMany`) paths so the two produce byte-identical relations.
function toTaskEvent(r: { at: string; kind: string; data: string | null }): TaskEvent {
  return {
    at: r.at,
    kind: r.kind,
    data: r.data ? (JSON.parse(r.data) as Record<string, unknown>) : undefined,
  };
}

function toTaskAttachment(r: {
  id: string;
  taskId: string;
  path: string;
  mime: string;
  size: number;
  originalName: string | null;
  createdAt: string;
}): TaskAttachment {
  return {
    id: r.id,
    taskId: r.taskId,
    path: r.path,
    mime: r.mime,
    size: r.size,
    originalName: r.originalName ?? undefined,
    createdAt: r.createdAt,
  };
}

function toTaskLink(r: {
  id: string;
  taskId: string;
  url: string;
  kind: string;
  label: string | null;
  createdAt: string;
}): TaskLink {
  return {
    id: r.id,
    taskId: r.taskId,
    url: r.url,
    kind: r.kind as TaskLink['kind'],
    label: r.label ?? undefined,
    createdAt: r.createdAt,
  };
}

/** Parse the JSON-array `tags` column to a string[]; tolerant of null/legacy/garbage. */
function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

/** Parse the JSON `ai_review` column; returns undefined on null/garbage. */
function parseAiReview(
  raw: string | null,
): { verdict: 'approved' | 'commented' | 'changes-requested'; summary: string; runId: string; reviewedAt: string } | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'verdict' in parsed &&
      'summary' in parsed &&
      'runId' in parsed &&
      'reviewedAt' in parsed
    ) {
      return parsed as { verdict: 'approved' | 'commented' | 'changes-requested'; summary: string; runId: string; reviewedAt: string };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

@Injectable()
export class TasksRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  /** Run `fn` inside a DB transaction — the service's seam for owning an atomic
   *  multi-write boundary (Phase 60 E). Repo write methods take the `tx` so a
   *  mid-write throw rolls the whole sequence back. */
  transaction<T>(fn: (tx: Tx) => T): T {
    return this.db.transaction(fn);
  }

  insertTask(row: TaskInsert, db: DbOrTx = this.db): TaskRow {
    return db.insert(tasks).values(row).returning().get();
  }

  insertEvent(row: TaskEventInsert, db: DbOrTx = this.db): void {
    db.insert(taskEvents).values(row).run();
  }

  insertAttachment(row: TaskAttachmentInsert, db: DbOrTx = this.db): void {
    db.insert(taskAttachments).values(row).run();
  }

  updateStatus(id: string, status: Status, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ status, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  setSession(id: string, sessionId: string | null, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ sessionId, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  setPrUrl(id: string, prUrl: string, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ prUrl, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  findByPrUrl(prUrl: string): TaskRow | undefined {
    return this.db.select().from(tasks).where(eq(tasks.prUrl, prUrl)).get();
  }

  setAiReview(
    id: string,
    aiReview: { verdict: string; summary: string; runId: string; reviewedAt: string },
    updatedAt: string,
  ): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ aiReview: JSON.stringify(aiReview), updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  // Bump the retry counter (used when an agent session crashes and is re-queued).
  // `nextRetryAt` gates when the scheduler may re-pick the task (Phase 53 B) —
  // null means eligible immediately (backoff disabled or not applicable).
  incrementRetry(id: string, updatedAt: string, nextRetryAt: string | null): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ retryCount: sql`${tasks.retryCount} + 1`, nextRetryAt, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  // Clear a pending backoff gate (Phase 53 B) — used on a manual requeue so a
  // human-returned task is immediately eligible regardless of any prior backoff.
  clearNextRetry(id: string, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ nextRetryAt: null, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  // Reset the full retry state (Phase 69 E) — zero the counter AND drop any
  // pending backoff. A reopened terminal task re-enters the queue as if fresh,
  // so its prior crash-retry budget must not carry over.
  resetRetryState(id: string, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ retryCount: 0, nextRetryAt: null, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  // Set (or clear, with null) the typed reason a task is parked in `waiting`
  // (Phase 53 D). Set on the transition into `waiting`, cleared on any exit.
  setWaitReason(id: string, waitReason: WaitReason | null, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ waitReason, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  // Update just the prompt (Phase 53 D re-plan). No status change.
  setPrompt(id: string, prompt: string, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ prompt, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  incrementFixAttempts(id: string, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ fixAttempts: sql`${tasks.fixAttempts} + 1`, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  setProject(id: string, projectId: string | null, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ projectId, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  setRepo(id: string, repo: string | null, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ repo, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  // Phase 58 D — assign (or unassign, with null) this task's roadmap milestone.
  setMilestone(id: string, milestoneId: string | null, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ milestoneId, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  // Phase 58 D — clear a milestone off every task it's assigned to (used when the
  // milestone is deleted). Returns the affected task ids so the service can
  // re-broadcast them. A cross-table cleanup UPDATE kept in the repository layer,
  // mirroring how ProjectsRepository reads `tasks` for its task counts.
  clearMilestone(milestoneId: string, updatedAt: string): string[] {
    const rows = this.db
      .update(tasks)
      .set({ milestoneId: null, updatedAt })
      .where(eq(tasks.milestoneId, milestoneId))
      .returning({ id: tasks.id })
      .all();
    return rows.map((r) => r.id);
  }

  setTags(id: string, tags: string[], updatedAt: string, db: DbOrTx = this.db): TaskRow | undefined {
    return db
      .update(tasks)
      .set({ tags: JSON.stringify(tags), updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  setPriority(id: string, priority: number, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ priority, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  setArchived(id: string, archivedAt: string | null, updatedAt: string): TaskRow | undefined {
    return this.db
      .update(tasks)
      .set({ archivedAt, updatedAt })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  // Deleting a task removes its event log, attachments, links and dependency
  // edges too. Edges are cleared in *both* directions: as a dependent (its own
  // blockers) and as a blocker (whatever depended on it — those become unblocked).
  // Wrapped in a transaction so the writes are atomic.
  deleteTask(id: string): void {
    this.db.transaction((tx) => {
      tx.delete(taskLinks).where(eq(taskLinks.taskId, id)).run();
      tx.delete(taskAttachments).where(eq(taskAttachments.taskId, id)).run();
      tx.delete(taskEvents).where(eq(taskEvents.taskId, id)).run();
      tx.delete(taskDependencies)
        .where(
          or(eq(taskDependencies.taskId, id), eq(taskDependencies.dependsOnTaskId, id)),
        )
        .run();
      tx.delete(prStatus).where(eq(prStatus.taskId, id)).run();
      tx.delete(tasks).where(eq(tasks.id, id)).run();
    });
  }

  listTasks(status?: Status, projectId?: string, scope?: TeamScope): TaskRow[] {
    const where = and(
      status ? eq(tasks.status, status) : undefined,
      projectId ? eq(tasks.projectId, projectId) : undefined,
      scope ? teamScopeFilter(tasks.createdBy, tasks.teamId, scope) : undefined,
    );
    // Highest priority first, then oldest within a priority — this drives the
    // scheduler's todo selection and the board's within-column order.
    return this.db
      .select()
      .from(tasks)
      .where(where)
      .orderBy(desc(tasks.priority), asc(tasks.createdAt), asc(tasks.id))
      .all();
  }

  /**
   * A page of task rows + the full filtered `total` (Phase 57 C). Same filter +
   * `desc(priority), asc(createdAt)` ordering as {@link listTasks}; when `limit`
   * is given it applies `LIMIT/OFFSET` (offset pagination, 1-indexed `page`),
   * otherwise returns every matching row (the board loads all columns). `total`
   * is a separate `COUNT(*)` over the same filter so a paged caller knows the set
   * size without over-fetching.
   */
  listTaskPage(
    status?: Status,
    projectId?: string,
    scope?: TeamScope,
    opts?: { page?: number; limit?: number },
  ): { rows: TaskRow[]; total: number } {
    const where = and(
      status ? eq(tasks.status, status) : undefined,
      projectId ? eq(tasks.projectId, projectId) : undefined,
      scope ? teamScopeFilter(tasks.createdBy, tasks.teamId, scope) : undefined,
    );
    const total = Number(
      this.db.select({ count: sql<number>`COUNT(*)` }).from(tasks).where(where).get()?.count ?? 0,
    );
    const ordered = this.db
      .select()
      .from(tasks)
      .where(where)
      .orderBy(desc(tasks.priority), asc(tasks.createdAt), asc(tasks.id));
    const rows =
      opts?.limit != null
        ? ordered.limit(opts.limit).offset(((opts.page ?? 1) - 1) * opts.limit).all()
        : ordered.all();
    return { rows, total };
  }

  /**
   * Terminal (`done`/`abandoned`) tasks whose last transition (`updatedAt`) falls
   * in `[from, to]`, optionally scoped to a repo/project (Phase 62 C — the digest
   * window). There is no dedicated `completedAt`, so `updatedAt` stands in for the
   * terminal-transition time. Most-recently-finished first.
   */
  listTerminalTasksInWindow(
    from: string,
    to: string,
    repo?: string,
    projectId?: string,
  ): TaskRow[] {
    const where = and(
      inArray(tasks.status, ['done', 'abandoned']),
      gte(tasks.updatedAt, from),
      lte(tasks.updatedAt, to),
      repo ? eq(tasks.repo, repo) : undefined,
      projectId ? eq(tasks.projectId, projectId) : undefined,
    );
    return this.db.select().from(tasks).where(where).orderBy(desc(tasks.updatedAt)).all();
  }

  /**
   * The most recent task events across the (team-scoped) set (Phase 57 C) — one
   * indexed `ORDER BY at DESC LIMIT` join instead of the dashboard hydrating
   * every task's full event thread client-side. Returns lean `{taskId, title,
   * kind, at}` rows for the activity feed.
   */
  recentActivity(scope: TeamScope | undefined, limit: number): TaskActivityEntry[] {
    const where = scope ? teamScopeFilter(tasks.createdBy, tasks.teamId, scope) : undefined;
    return this.db
      .select({
        taskId: taskEvents.taskId,
        title: tasks.title,
        kind: taskEvents.kind,
        at: taskEvents.at,
      })
      .from(taskEvents)
      .innerJoin(tasks, eq(taskEvents.taskId, tasks.id))
      .where(where)
      .orderBy(desc(taskEvents.at))
      .limit(limit)
      .all();
  }

  getTask(id: string, scope?: TeamScope): TaskRow | undefined {
    const where = scope
      ? and(eq(tasks.id, id), teamScopeFilter(tasks.createdBy, tasks.teamId, scope))
      : eq(tasks.id, id);
    return this.db.select().from(tasks).where(where).get();
  }

  /**
   * Task rows for an explicit id set (team-scoped), chunked under the SQLite bound-
   * parameter cap. Used by the dependency graph (Phase 58 A) to pull in blocker
   * rows that fall outside a `?projectId=` filter.
   */
  tasksByIds(ids: string[], scope?: TeamScope): TaskRow[] {
    if (ids.length === 0) return [];
    const rows: TaskRow[] = [];
    for (const batch of chunkIds(ids)) {
      const where = scope
        ? and(inArray(tasks.id, batch), teamScopeFilter(tasks.createdBy, tasks.teamId, scope))
        : inArray(tasks.id, batch);
      rows.push(...this.db.select().from(tasks).where(where).all());
    }
    return rows;
  }

  /**
   * Blocker edges (`from` dependent → `to` its blocker) for a set of dependent
   * task ids. Phase 58 A graph builder; chunked over the id cap.
   */
  dependencyEdges(taskIds: string[]): Array<{ from: string; to: string }> {
    if (taskIds.length === 0) return [];
    const edges: Array<{ from: string; to: string }> = [];
    for (const batch of chunkIds(taskIds)) {
      const rows = this.db
        .select({ from: taskDependencies.taskId, to: taskDependencies.dependsOnTaskId })
        .from(taskDependencies)
        .where(inArray(taskDependencies.taskId, batch))
        .all();
      edges.push(...rows);
    }
    return edges;
  }

  listEvents(taskId: string): TaskEvent[] {
    const rows = this.db
      .select()
      .from(taskEvents)
      .where(eq(taskEvents.taskId, taskId))
      .orderBy(asc(taskEvents.at))
      .all();
    return rows.map(toTaskEvent);
  }

  listAttachments(taskId: string): TaskAttachment[] {
    const rows = this.db
      .select()
      .from(taskAttachments)
      .where(eq(taskAttachments.taskId, taskId))
      .orderBy(asc(taskAttachments.createdAt))
      .all();
    return rows.map(toTaskAttachment);
  }

  insertLink(row: TaskLinkInsert): void {
    this.db.insert(taskLinks).values(row).run();
  }

  listLinks(taskId: string): TaskLink[] {
    const rows = this.db
      .select()
      .from(taskLinks)
      .where(eq(taskLinks.taskId, taskId))
      .orderBy(asc(taskLinks.createdAt))
      .all();
    return rows.map(toTaskLink);
  }

  getLink(taskId: string, linkId: string): TaskLink | undefined {
    return this.listLinks(taskId).find((l) => l.id === linkId);
  }

  deleteLink(taskId: string, linkId: string): void {
    this.db
      .delete(taskLinks)
      .where(and(eq(taskLinks.id, linkId), eq(taskLinks.taskId, taskId)))
      .run();
  }

  // ---- dependency edges (Phase 27) ----

  /** Add a blocker edge `taskId → dependsOnTaskId`; a duplicate pair is a no-op. */
  addDependency(taskId: string, dependsOnTaskId: string, createdAt: string, db: DbOrTx = this.db): void {
    db
      .insert(taskDependencies)
      .values({ taskId, dependsOnTaskId, createdAt })
      .onConflictDoNothing()
      .run();
  }

  removeDependency(taskId: string, dependsOnTaskId: string): void {
    this.db
      .delete(taskDependencies)
      .where(
        and(
          eq(taskDependencies.taskId, taskId),
          eq(taskDependencies.dependsOnTaskId, dependsOnTaskId),
        ),
      )
      .run();
  }

  /** Ids of the tasks that block `taskId` (its blockers). */
  dependenciesOf(taskId: string): string[] {
    return this.db
      .select({ id: taskDependencies.dependsOnTaskId })
      .from(taskDependencies)
      .where(eq(taskDependencies.taskId, taskId))
      .all()
      .map((r) => r.id);
  }

  /** Ids of the tasks that `taskId` blocks (its dependents). */
  dependentsOf(taskId: string): string[] {
    return this.db
      .select({ id: taskDependencies.taskId })
      .from(taskDependencies)
      .where(eq(taskDependencies.dependsOnTaskId, taskId))
      .all()
      .map((r) => r.id);
  }

  /**
   * `todo` tasks that are *ready* — every blocker is `done` (or has none) **and**
   * any retry-backoff window has elapsed (`next_retry_at <= now`, or null) —
   * keeping the scheduler's `desc(priority), asc(createdAt)` ordering. Readiness
   * is evaluated in SQL (a correlated `NOT EXISTS` over unmet blockers) so the
   * tick stays cheap at scale. `now` is passed by the service (it owns the clock);
   * ISO timestamps compare lexicographically. Backs the Phase 27 B / 53 B scheduler.
   */
  listReadyTodoTasks(now: string): TaskRow[] {
    return this.db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.status, 'todo'),
          sql`(${tasks.nextRetryAt} IS NULL OR ${tasks.nextRetryAt} <= ${now})`,
          sql`NOT EXISTS (
            SELECT 1 FROM task_dependencies d
            JOIN tasks b ON b.id = d.depends_on_task_id
            WHERE d.task_id = tasks.id AND b.status != 'done'
          )`,
        ),
      )
      .orderBy(desc(tasks.priority), asc(tasks.createdAt), asc(tasks.id))
      .all();
  }

  // ---- PR status (Phase 22 Theme C) ----

  getPrStatusRow(taskId: string): PrStatusRow | undefined {
    return this.db.select().from(prStatus).where(eq(prStatus.taskId, taskId)).get();
  }

  /** Insert or replace the PR status for a task (keyed by `taskId`). */
  upsertPrStatus(row: PrStatusInsert): void {
    this.db
      .insert(prStatus)
      .values(row)
      .onConflictDoUpdate({
        target: prStatus.taskId,
        set: {
          url: row.url,
          number: row.number,
          state: row.state,
          checks: row.checks,
          reviewDecision: row.reviewDecision ?? null,
          fetchedAt: row.fetchedAt,
        },
      })
      .run();
  }

  /**
   * Tasks the poller should refresh: those with a PR URL whose last-known status
   * isn't terminal (merged/closed). A task with a URL but no status row yet is
   * included (never fetched). Terminal rows are excluded so a settled PR stops
   * being polled. Highest-priority/oldest first, matching the board order.
   */
  listTasksWithUnmergedPr(): TaskRow[] {
    const terminal = this.db
      .select({ id: prStatus.taskId })
      .from(prStatus)
      .where(inArray(prStatus.state, ['merged', 'closed']));
    return this.db
      .select()
      .from(tasks)
      .where(and(isNotNull(tasks.prUrl), notInArray(tasks.id, terminal)))
      .orderBy(desc(tasks.priority), asc(tasks.createdAt), asc(tasks.id))
      .all();
  }

  countsByStatus(): Record<Status, number> {
    const result: Record<Status, number> = {
      backlog: 0,
      todo: 0,
      wip: 0,
      waiting: 0,
      done: 0,
      abandoned: 0,
    };
    const rows = this.db
      .select({ status: tasks.status, count: sql<number>`COUNT(*)` })
      .from(tasks)
      .groupBy(tasks.status)
      .all();
    for (const row of rows) {
      if (row.status in result) {
        result[row.status as Status] = Number(row.count);
      }
    }
    return result;
  }

  hydrate(row: TaskRow): Task {
    return this.assembleTask(row, {
      prStatus: this.getPrStatusRow(row.id),
      dependsOn: this.dependenciesOf(row.id),
      checkRunStatus: this.deriveCheckRunStatus(row.id),
      events: this.listEvents(row.id),
      attachments: this.listAttachments(row.id),
      links: this.resolveLinks(row),
    });
  }

  /**
   * Batched hydration for a page of rows — the N+1 fix (Phase 57 B). Instead of
   * `rows.map(hydrate)` firing 6 queries/row (`6N`), it issues **one query per
   * relation** over the whole page (`WHERE taskId IN (…)`, chunked under
   * {@link ID_CHUNK}), groups the results in memory, and assembles each `Task`
   * through the same {@link assembleTask} the single-row path uses — so the
   * output is identical, only the query count changes (`~6` total, not `6N`).
   * Keep {@link hydrate} for single-row detail lookups.
   */
  hydrateMany(rows: TaskRow[]): Task[] {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const prByTask = this.prStatusByTaskIds(ids);
    const depsByTask = this.dependenciesByTaskIds(ids);
    const checkByTask = this.checkRunStatusByTaskIds(ids);
    const eventsByTask = this.eventsByTaskIds(ids);
    const attByTask = this.attachmentsByTaskIds(ids);
    const linksByTask = this.linksByTaskIds(ids);
    return rows.map((row) =>
      this.assembleTask(row, {
        prStatus: prByTask.get(row.id),
        dependsOn: depsByTask.get(row.id) ?? [],
        checkRunStatus: checkByTask.get(row.id),
        events: eventsByTask.get(row.id) ?? [],
        attachments: attByTask.get(row.id) ?? [],
        links: this.legacyLinkFallback(row, linksByTask.get(row.id) ?? []),
      }),
    );
  }

  /**
   * Batched **summary** hydration for a page of rows (Phase 57 C) — the lean board
   * DTO. Loads only what a board card renders: the badge relations (prStatus,
   * checkRunStatus, blocker ids) + the first image attachment + up to six links,
   * and precomputes `answered` from a single answer-event lookup. Deliberately
   * skips the full event thread + prompt (the payload the summary exists to shed).
   * Same batched-query shape as {@link hydrateMany} (~5 queries/page, not per row).
   */
  summariseMany(rows: TaskRow[]): TaskSummary[] {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const prByTask = this.prStatusByTaskIds(ids);
    const depsByTask = this.dependenciesByTaskIds(ids);
    const checkByTask = this.checkRunStatusByTaskIds(ids);
    const attByTask = this.attachmentsByTaskIds(ids);
    const linksByTask = this.linksByTaskIds(ids);
    const answeredIds = this.answeredTaskIds(ids);
    const milestoneNames = this.milestoneNamesFor(rows);
    return rows.map((row) => {
      const attachments = attByTask.get(row.id) ?? [];
      const firstImage = attachments.find((a) => a.mime.startsWith('image/'));
      return {
        id: row.id,
        title: row.title,
        kind: row.kind as Task['kind'],
        status: row.status as Status,
        priority: row.priority,
        retryCount: row.retryCount,
        repo: row.repo ?? undefined,
        projectId: row.projectId ?? undefined,
        milestoneId: row.milestoneId ?? undefined,
        milestoneName: row.milestoneId ? milestoneNames.get(row.milestoneId) : undefined,
        tags: parseTags(row.tags),
        prUrl: row.prUrl ?? undefined,
        prStatus: this.toPrStatus(prByTask.get(row.id)),
        checkRunStatus: checkByTask.get(row.id),
        waitReason: (row.waitReason as WaitReason | null) ?? undefined,
        dependsOn: depsByTask.get(row.id) ?? [],
        // First image only (the card thumbnail); other attachments are dropped.
        attachments: firstImage ? [firstImage] : [],
        // Only the six links the card renders as source icons.
        links: this.legacyLinkFallback(row, linksByTask.get(row.id) ?? []).slice(0, 6),
        aiReview: parseAiReview(row.aiReview),
        // A `question` with an inline answer event (was isAnsweredQuestion) —
        // precomputed so the summary needn't carry the event thread.
        answered: row.kind === 'question' && answeredIds.has(row.id),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
  }

  /**
   * Phase 58 F — id→name for the milestones referenced by a page of rows, in one
   * query. A repo-level join (not the milestones module) so tasks stays free of a
   * milestones→tasks module cycle. Empty when no row carries a milestoneId.
   */
  milestoneNamesFor(rows: TaskRow[]): Map<string, string> {
    const milestoneIds = [...new Set(rows.map((r) => r.milestoneId).filter((id): id is string => !!id))];
    const out = new Map<string, string>();
    if (milestoneIds.length === 0) return out;
    const found = this.db
      .select({ id: roadmapMilestones.id, name: roadmapMilestones.name })
      .from(roadmapMilestones)
      .where(inArray(roadmapMilestones.id, milestoneIds))
      .all();
    for (const m of found) out.set(m.id, m.name);
    return out;
  }

  /** Ids (of the given set) that have at least one `answer` event — one query. */
  private answeredTaskIds(ids: string[]): Set<string> {
    const answered = new Set<string>();
    for (const batch of chunkIds(ids)) {
      const rows = this.db
        .selectDistinct({ taskId: taskEvents.taskId })
        .from(taskEvents)
        .where(and(inArray(taskEvents.taskId, batch), eq(taskEvents.kind, ANSWER_EVENT_KIND)))
        .all();
      for (const r of rows) answered.add(r.taskId);
    }
    return answered;
  }

  // Assemble a `Task` from its row + already-loaded relations. The single point
  // of truth for the shape, shared by `hydrate` (per-row loads) and
  // `hydrateMany` (batched loads) so they can never drift.
  private assembleTask(
    row: TaskRow,
    rel: {
      prStatus: PrStatusRow | undefined;
      dependsOn: string[];
      checkRunStatus: CheckRunStatus | undefined;
      events: TaskEvent[];
      attachments: TaskAttachment[];
      links: TaskLink[];
    },
  ): Task {
    return {
      id: row.id,
      title: row.title,
      kind: row.kind as Task['kind'],
      status: row.status as Status,
      priority: row.priority,
      retryCount: row.retryCount,
      fixAttempts: row.fixAttempts,
      nextRetryAt: row.nextRetryAt ?? undefined,
      waitReason: (row.waitReason as WaitReason | null) ?? undefined,
      prompt: row.prompt ?? undefined,
      repo: row.repo ?? undefined,
      agentId: row.agentId ?? undefined,
      sessionId: row.sessionId ?? undefined,
      projectId: row.projectId ?? undefined,
      milestoneId: row.milestoneId ?? undefined,
      prUrl: row.prUrl ?? undefined,
      prStatus: this.toPrStatus(rel.prStatus),
      tags: parseTags(row.tags),
      dependsOn: rel.dependsOn,
      checkRunStatus: rel.checkRunStatus,
      aiReview: parseAiReview(row.aiReview),
      archivedAt: row.archivedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      events: rel.events,
      attachments: rel.attachments,
      links: rel.links,
    };
  }

  // ── Batched relation loaders (one query/relation over a page of ids) ────────

  /** Latest-known PR status keyed by taskId (≤1 row/task). */
  private prStatusByTaskIds(ids: string[]): Map<string, PrStatusRow> {
    const map = new Map<string, PrStatusRow>();
    for (const batch of chunkIds(ids)) {
      for (const r of this.db.select().from(prStatus).where(inArray(prStatus.taskId, batch)).all()) {
        map.set(r.taskId, r);
      }
    }
    return map;
  }

  /** Blocker ids (`dependsOn`) keyed by taskId. */
  private dependenciesByTaskIds(ids: string[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const batch of chunkIds(ids)) {
      const rows = this.db
        .select({ taskId: taskDependencies.taskId, dependsOn: taskDependencies.dependsOnTaskId })
        .from(taskDependencies)
        .where(inArray(taskDependencies.taskId, batch))
        .all();
      for (const r of rows) pushGroup(map, r.taskId, r.dependsOn);
    }
    return map;
  }

  /**
   * Derived check-run status keyed by taskId — the *latest* run's pass/fail.
   * Ordered `startedAt` ascending so the last row seen per task is the newest
   * (last-wins), matching {@link latestCheckRunForTask}'s `desc … limit 1`.
   */
  private checkRunStatusByTaskIds(ids: string[]): Map<string, CheckRunStatus> {
    const map = new Map<string, CheckRunStatus>();
    for (const batch of chunkIds(ids)) {
      const rows = this.db
        .select({ taskId: taskCheckRuns.taskId, passed: taskCheckRuns.passed })
        .from(taskCheckRuns)
        .where(inArray(taskCheckRuns.taskId, batch))
        .orderBy(asc(taskCheckRuns.startedAt))
        .all();
      for (const r of rows) map.set(r.taskId, r.passed ? 'passed' : 'failing');
    }
    return map;
  }

  /** Event threads keyed by taskId, each ordered `at` ascending. */
  private eventsByTaskIds(ids: string[]): Map<string, TaskEvent[]> {
    const map = new Map<string, TaskEvent[]>();
    for (const batch of chunkIds(ids)) {
      const rows = this.db
        .select()
        .from(taskEvents)
        .where(inArray(taskEvents.taskId, batch))
        .orderBy(asc(taskEvents.at))
        .all();
      for (const r of rows) pushGroup(map, r.taskId, toTaskEvent(r));
    }
    return map;
  }

  /** Attachments keyed by taskId, each ordered `createdAt` ascending. */
  private attachmentsByTaskIds(ids: string[]): Map<string, TaskAttachment[]> {
    const map = new Map<string, TaskAttachment[]>();
    for (const batch of chunkIds(ids)) {
      const rows = this.db
        .select()
        .from(taskAttachments)
        .where(inArray(taskAttachments.taskId, batch))
        .orderBy(asc(taskAttachments.createdAt))
        .all();
      for (const r of rows) pushGroup(map, r.taskId, toTaskAttachment(r));
    }
    return map;
  }

  /** Links keyed by taskId, each ordered `createdAt` ascending (legacy fallback applied per-row in `hydrateMany`). */
  private linksByTaskIds(ids: string[]): Map<string, TaskLink[]> {
    const map = new Map<string, TaskLink[]>();
    for (const batch of chunkIds(ids)) {
      const rows = this.db
        .select()
        .from(taskLinks)
        .where(inArray(taskLinks.taskId, batch))
        .orderBy(asc(taskLinks.createdAt))
        .all();
      for (const r of rows) pushGroup(map, r.taskId, toTaskLink(r));
    }
    return map;
  }

  private deriveCheckRunStatus(taskId: string): CheckRunStatus | undefined {
    const run = this.latestCheckRunForTask(taskId);
    if (!run) return undefined;
    return run.passed ? 'passed' : 'failing';
  }

  // Map a persisted pr_status row to the shared PrStatus shape (the text columns
  // are app-validated enums; cast on read). Undefined when no row exists yet.
  private toPrStatus(row: PrStatusRow | undefined): PrStatus | undefined {
    if (!row) return undefined;
    return {
      state: row.state as PrStatus['state'],
      checks: row.checks as PrStatus['checks'],
      reviewDecision: (row.reviewDecision as PrStatus['reviewDecision']) ?? undefined,
      url: row.url,
      number: row.number,
      fetchedAt: row.fetchedAt,
    };
  }

  // Surface a legacy single prUrl as a link until it's migrated to task_links.
  private resolveLinks(row: TaskRow): TaskLink[] {
    return this.legacyLinkFallback(row, this.listLinks(row.id));
  }

  // Shared by hydrate/hydrateMany: if a task has no task_links rows but carries a
  // legacy `prUrl`, synthesise a single link for it.
  private legacyLinkFallback(row: TaskRow, links: TaskLink[]): TaskLink[] {
    if (links.length === 0 && row.prUrl) {
      return [
        {
          id: `legacy-${row.id}`,
          taskId: row.id,
          url: row.prUrl,
          kind: detectSourceKind(row.prUrl),
          createdAt: row.createdAt,
        },
      ];
    }
    return links;
  }

  // ── Check-run history (Phase 30 B1) ────────────────────────────────────────

  insertCheckRun(row: TaskCheckRunInsert): void {
    this.db.insert(taskCheckRuns).values(row).run();
  }

  checkRunsForTask(taskId: string): CheckRun[] {
    return this.db
      .select()
      .from(taskCheckRuns)
      .where(eq(taskCheckRuns.taskId, taskId))
      .orderBy(asc(taskCheckRuns.startedAt))
      .all()
      .map(checkRunRowToCheckRun);
  }

  latestCheckRunForTask(taskId: string): CheckRun | null {
    const row = this.db
      .select()
      .from(taskCheckRuns)
      .where(eq(taskCheckRuns.taskId, taskId))
      .orderBy(desc(taskCheckRuns.startedAt))
      .limit(1)
      .all()[0];
    return row ? checkRunRowToCheckRun(row) : null;
  }
}
