import type { Status, Task } from '@midnite/shared';

// Phase 47 F — client-side bulk-by-filter ops. The CLI stays thin: it resolves a
// task set with `listTasks` + these pure filters, then loops the existing per-task
// client methods (moveTask / setPriority). No batch-mutation API on the gateway.

/** Selection filter for a bulk op — any combination narrows the set (AND). */
export interface BulkFilter {
  status?: Status;
  repo?: string;
  project?: string;
}

/** Whether at least one filter is set — the signal to enter bulk mode. */
export function hasFilter(f: BulkFilter): boolean {
  return f.status !== undefined || f.repo !== undefined || f.project !== undefined;
}

/** Narrow `tasks` to those matching every set filter field (case-sensitive match). */
export function filterTasks(tasks: Task[], f: BulkFilter): Task[] {
  return tasks.filter(
    (t) =>
      (f.status === undefined || t.status === f.status) &&
      (f.repo === undefined || t.repo === f.repo) &&
      (f.project === undefined || t.projectId === f.project),
  );
}

/** A single task's outcome in a bulk op. */
export interface BulkOpResult {
  id: string;
  title: string;
  ok: boolean;
  error?: string;
}

/** Rows for the end-of-run summary table: id, title, ✓/✗, error. */
export function bulkOpResultRows(results: BulkOpResult[]): string[][] {
  return results.map((r) => [r.id, r.title, r.ok ? '✓' : '✗', r.error ?? '']);
}

/** A human summary line, e.g. "3 ok · 1 failed". */
export function bulkOpSummaryLine(results: BulkOpResult[]): string {
  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;
  return `${ok} ok · ${failed} failed`;
}

/** Exit non-zero only when every item failed (partial success is still success). */
export function bulkOpExitCode(results: BulkOpResult[]): number {
  return results.length > 0 && results.every((r) => !r.ok) ? 1 : 0;
}
