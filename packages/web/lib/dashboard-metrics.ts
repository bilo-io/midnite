import type { TaskSummary } from '@midnite/shared';

export type DayBucket = { /** YYYY-MM-DD (local) */ key: string; /** day-of-month label */ label: string; count: number };

/** Local YYYY-MM-DD for an epoch-ms instant. */
function localDayKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Completion instant for a done task — its `updatedAt` (the done-transition sets
 *  it). Phase 57 C: the lean summary carries no event thread, and for a done task
 *  `updatedAt` is that final transition, so the throughput chart is unchanged. */
function completedAt(task: TaskSummary): number | null {
  const iso = task.updatedAt;
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Count `done` tasks per local day across the trailing `days`-day window ending
 * on the day containing `now`. Returns one bucket per day, oldest first, with
 * empty days included so the chart keeps a stable width. `now` is injected for
 * deterministic testing.
 */
export function completionsByDay(tasks: TaskSummary[], days: number, now: number): DayBucket[] {
  const buckets: DayBucket[] = [];
  const index = new Map<string, number>();
  const dayMs = 86_400_000;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    const key = localDayKey(d.getTime());
    index.set(key, buckets.length);
    buckets.push({ key, label: String(d.getDate()), count: 0 });
  }

  for (const task of tasks) {
    if (task.status !== 'done') continue;
    const ms = completedAt(task);
    if (ms == null) continue;
    const slot = index.get(localDayKey(ms));
    if (slot != null) buckets[slot]!.count += 1;
  }

  return buckets;
}
