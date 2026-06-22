import type { Task } from '@midnite/shared';

/**
 * Pure helpers over the shared {@link Task} for the dependency UI (Phase 27 C).
 *
 * "blocked" is *derived*, never a stored status: a blocker satisfies a dependency
 * only once its status is `done`, and a task is blocked while any of its
 * `dependsOn` ids resolve to a missing or not-`done` task. These mirror the
 * gateway's ready-set rule so the board's "Blocked by N" chip and the manual-start
 * confirm agree with what the scheduler does.
 */

/** A blocker satisfies its dependency only when it is `done` (a missing blocker is unmet). */
export function isBlockerSatisfied(blocker: Task | undefined): boolean {
  return blocker?.status === 'done';
}

/** The subset of `task.dependsOn` whose resolved task is missing or not `done`. */
export function unmetBlockerIds(task: Task, tasksById: Map<string, Task>): string[] {
  return (task.dependsOn ?? []).filter((id) => !isBlockerSatisfied(tasksById.get(id)));
}

/** How many of a task's blockers are still unmet. */
export function unmetBlockerCount(task: Task, tasksById: Map<string, Task>): number {
  return unmetBlockerIds(task, tasksById).length;
}

/** id → unmet-blocker count for every task (builds the lookup once internally). */
export function blockedCounts(tasks: Task[]): Map<string, number> {
  const tasksById = new Map(tasks.map((t) => [t.id, t] as const));
  const counts = new Map<string, number>();
  for (const t of tasks) counts.set(t.id, unmetBlockerCount(t, tasksById));
  return counts;
}

/** Tasks whose `dependsOn` includes `taskId` (i.e. the tasks this one blocks). */
export function dependentsOf(taskId: string, tasks: Task[]): Task[] {
  return tasks.filter((t) => (t.dependsOn ?? []).includes(taskId));
}
