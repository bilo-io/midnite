import { isNeedsAttention, type RetroOutcome, type Task, type TaskFailure, type TaskRetro } from '@midnite/shared';

import type {
  AgentRunStatsRow,
  TaskCheckRunRow,
  TaskEventRow,
  TaskFailureRow,
} from '../../db/schema';

/**
 * The retro outcome a task's current state represents, or `null` when the task
 * isn't in a retro-worthy state. `done`/`abandoned` are terminal; a task parked
 * in `waiting` with a needs-attention `waitReason` (Phase 53) maps to
 * `needs-attention` (Phase 62 — a skeleton is built there too). Any other state
 * (todo/wip/plain-waiting) yields `null` — no retro.
 */
export function retroOutcomeForTask(task: Task): RetroOutcome | null {
  if (task.status === 'done') return 'done';
  if (task.status === 'abandoned') return 'abandoned';
  if (task.status === 'waiting' && isNeedsAttention(task.waitReason)) return 'needs-attention';
  return null;
}

/** The raw per-task material a retro is assembled from. */
export type RetroSources = {
  events: TaskEventRow[];
  runStats: AgentRunStatsRow[];
  failures: TaskFailureRow[];
  checkRuns: TaskCheckRunRow[];
};

/**
 * Assemble the deterministic retro **skeleton** for a terminal task — pure, zero
 * LLM (Phase 62 A). `narrative` is always null here; a later theme layers on the
 * LLM summary. `now` is the retro's build timestamp (injected for testability).
 */
export function buildRetro(task: Task, sources: RetroSources, now: string): TaskRetro {
  // The subscriber only calls this for retro-worthy states; fall back to
  // `abandoned` defensively so `outcome` is never null.
  const outcome: RetroOutcome = retroOutcomeForTask(task) ?? 'abandoned';

  const timeline = sources.events.map((e) => ({
    at: e.at,
    kind: e.kind,
    ...(eventDetail(e.data) ? { detail: eventDetail(e.data)! } : {}),
  }));

  const attempts = sources.runStats.map((s) => ({
    startedAt: s.startedAt,
    endedAt: s.endedAt ?? null,
    durationMs: s.durationMs ?? null,
    outcome: s.outcome ?? null,
    retryIndex: s.retryCount,
  }));

  const failures: TaskFailure[] = sources.failures.map((f) => ({
    id: f.id,
    taskId: f.taskId,
    class: f.class as TaskFailure['class'],
    detail: f.detail,
    ...(f.exitCode != null ? { exitCode: f.exitCode } : {}),
    ...(f.lastOutput != null ? { lastOutput: f.lastOutput } : {}),
    retryIndex: f.retryIndex,
    ...(f.teamId != null ? { teamId: f.teamId } : {}),
    at: f.at,
  }));

  const checks = summarizeChecks(sources.checkRuns, task.checkRunStatus);
  const review = task.aiReview ? { verdict: task.aiReview.verdict, summary: task.aiReview.summary } : undefined;

  return {
    taskId: task.id,
    outcome,
    timeline,
    attempts,
    failures,
    ...(checks ? { checks } : {}),
    ...(review ? { review } : {}),
    ...(task.prUrl ? { prUrl: task.prUrl } : {}),
    durations: computeDurations(task.createdAt, sources.runStats, sources.events),
    narrative: null,
    createdAt: now,
  };
}

/** Pull a short human detail out of an event's JSON `data` payload, if any. */
function eventDetail(data: string | null): string | undefined {
  if (!data) return undefined;
  try {
    const parsed: unknown = JSON.parse(data);
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Record<string, unknown>;
      for (const key of ['reason', 'detail', 'message', 'status', 'to']) {
        if (typeof o[key] === 'string') return o[key] as string;
      }
    }
  } catch {
    // Non-JSON payload — a raw string is itself the detail.
    return data.length <= 200 ? data : undefined;
  }
  return undefined;
}

function summarizeChecks(
  runs: TaskCheckRunRow[],
  status: Task['checkRunStatus'],
): TaskRetro['checks'] | undefined {
  if (runs.length === 0) return undefined;
  const passed = runs.filter((r) => r.passed === 1).length;
  const failed = runs.length - passed;
  return { status: status ?? (failed > 0 ? 'failing' : 'passed'), passed, failed };
}

function computeDurations(
  createdAt: string | undefined,
  runStats: AgentRunStatsRow[],
  events: TaskEventRow[],
): TaskRetro['durations'] {
  const firstStart = runStats[0]?.startedAt;
  // Latest resolved boundary: the last run's end, else the last recorded event.
  const lastEnd =
    [...runStats].reverse().find((s) => s.endedAt)?.endedAt ?? events[events.length - 1]?.at ?? undefined;
  return {
    waitMs: createdAt && firstStart ? diffMs(createdAt, firstStart) : null,
    workMs: firstStart && lastEnd ? diffMs(firstStart, lastEnd) : null,
    totalMs: createdAt && lastEnd ? diffMs(createdAt, lastEnd) : null,
  };
}

/** Non-negative ms between two ISO timestamps; null if either doesn't parse. */
function diffMs(from: string, to: string): number | null {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, b - a);
}
