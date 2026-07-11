import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  GAUGE_HISTORY_MAX_POINTS,
  type CycleTimeGroup,
  type CycleTimeGroupBy,
  type CycleTimeQuery,
  type CycleTimeResponse,
  type GaugeHistoryQuery,
  type GaugeHistoryResponse,
  type MetricsGauges,
  type MetricsRollup,
  type MetricsRollupQuery,
  type MetricsRollupResponse,
  type OpsSummary,
  type OpsQuery,
  type RunOutcome,
  type RunTimelineResponse,
} from '@midnite/shared';

import { MetricsRepository, type DoneTaskCycleRow } from './metrics.repository';
import { MetricsEventBus } from './metrics-event-bus';
import { GaugeStore } from './gauge-store';
import { deriveCycle, statOf, type TaskCycle } from './lib/cycle-time';

const DAY_MS = 24 * 60 * 60 * 1_000;

/** Mutable per-group accumulator while aggregating cycle-time rows. */
interface CycleAcc {
  key: string;
  taskCount: number;
  wait: number[];
  work: number[];
  endToEnd: number[];
  retryOverheadMsTotal: number;
  tasksWithRetries: number;
}

/** Default window: last 7 days when no from/to is supplied. */
const DEFAULT_WINDOW_DAYS = 7;

function defaultWindow(): { from: string; to: string } {
  const to = new Date().toISOString();
  const from = new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1_000).toISOString();
  return { from, to };
}

@Injectable()
export class MetricsService {
  private readonly gauges = new GaugeStore();

  /**
   * Memoized per-terminal-task segments (Phase 61 C). A completed task's segments
   * are immutable, so we cache them keyed by `id@doneAt` — the `doneAt` suffix
   * self-invalidates if a task is re-opened and completed again (a fresh `done`
   * timestamp ⇒ a fresh entry) rather than serving stale segments.
   */
  private readonly cycleCache = new Map<string, TaskCycle>();

  // Phase 61 F: coalesce a burst of gauge writes (the scheduler records queue
  // depth + tick latency back-to-back each tick) into a single live push.
  private gaugeEmitScheduled = false;

  // `@Optional()` so unit specs can `new MetricsService(repo)` without a bus;
  // in the app it's provided by MetricsModule and drives the live WS channel.
  constructor(
    // Explicit @Inject: the `@Optional()` bus param erases reflect-metadata's
    // design:paramtypes for the whole constructor, so type-only injection left
    // `repo` undefined and every repo-backed read (e.g. GET /metrics/ops) 500'd.
    @Inject(MetricsRepository) private readonly repo: MetricsRepository,
    @Optional() private readonly bus?: MetricsEventBus,
  ) {}

  // ── Gauge setters (called by scheduler / pool / runner) ─────────────────────

  recordQueueDepth(depth: number): void {
    this.gauges.recordQueueDepth(depth, new Date().toISOString());
    this.scheduleGaugeEmit();
  }

  recordSlotChange(used: number, total: number): void {
    this.gauges.recordSlotChange(used, total, new Date().toISOString());
    this.scheduleGaugeEmit();
  }

  recordTickLatency(ms: number): void {
    this.gauges.recordTickLatency(ms, new Date().toISOString());
    this.scheduleGaugeEmit();
  }

  /** The current live gauges, mapped to the wire shape (shared by the Ops
   *  summary and the live WS push). */
  currentGauges(): MetricsGauges {
    const snap = this.gauges.snapshot();
    return {
      queueDepth: snap.queueDepth,
      slotsUsed: snap.slots?.used ?? null,
      slotsTotal: snap.slots?.total ?? null,
      lastTickLatencyMs: snap.lastTickLatencyMs,
      updatedAt: snap.updatedAt,
    };
  }

  /** Publish a live gauge snapshot on the next microtask, coalescing a burst of
   *  writes in the same tick into one push. No-op when no bus is wired. */
  private scheduleGaugeEmit(): void {
    if (!this.bus || this.gaugeEmitScheduled) return;
    this.gaugeEmitScheduled = true;
    queueMicrotask(() => {
      this.gaugeEmitScheduled = false;
      this.bus?.emit({ type: 'metrics.gauges', gauges: this.currentGauges() });
    });
  }

  // ── Run lifecycle (called by agent runner) ───────────────────────────────────

  recordRunStart(id: string, taskId: string, retryCount: number, repo?: string): void {
    this.repo.insertStart({
      id,
      taskId,
      startedAt: new Date().toISOString(),
      retryCount,
      repo: repo ?? null,
    });
  }

  recordRunEnd(
    id: string,
    outcome: 'done' | 'abandoned' | 'failed' | 'cancelled',
    durationMs: number,
  ): void {
    this.repo.recordEnd(id, new Date().toISOString(), durationMs, outcome);
  }

  // ── Query ────────────────────────────────────────────────────────────────────

  getOpsSummary(query: OpsQuery): OpsSummary {
    const { from, to } = query.from && query.to ? { from: query.from, to: query.to } : defaultWindow();

    return {
      gauges: this.currentGauges(),
      throughputByDay: this.repo.countByDay(from, to),
      durationBuckets: this.repo.durationBuckets(from, to),
      outcomeCounts: this.repo.outcomeCounts(from, to),
    };
  }

  // ── Gauge history (Phase 61 D) ───────────────────────────────────────────────

  /**
   * Persist one sample of the current gauges. Skips (returns false) when no gauge
   * has been set yet — an all-null sample would only add a leading gap to the
   * trend chart. Called by MetricsSamplerService on its interval.
   */
  sampleGauges(at: string = new Date().toISOString()): boolean {
    const snap = this.gauges.snapshot();
    const allNull =
      snap.queueDepth === null && snap.slots === null && snap.lastTickLatencyMs === null;
    if (allNull) return false;
    this.repo.insertGaugeSample({
      id: randomUUID(),
      at,
      queueDepth: snap.queueDepth,
      slotsUsed: snap.slots?.used ?? null,
      slotsTotal: snap.slots?.total ?? null,
      tickLatencyMs: snap.lastTickLatencyMs,
    });
    return true;
  }

  /** Prune gauge samples older than `retentionDays` (0 = keep forever). Returns
   *  the deleted count. Called by the sampler after each write. */
  pruneGaugeSamples(retentionDays: number, now: number = Date.now()): number {
    if (retentionDays <= 0) return 0;
    const before = new Date(now - retentionDays * 24 * 60 * 60 * 1_000).toISOString();
    return this.repo.pruneGaugeSamplesBefore(before);
  }

  /** Sampled gauge series for the Ops fleet-trend charts (Phase 61 D). */
  getGaugeHistory(query: GaugeHistoryQuery): GaugeHistoryResponse {
    const { samples, truncated } = this.repo.gaugeHistory(
      query.from,
      query.to,
      GAUGE_HISTORY_MAX_POINTS,
    );
    return {
      samples: samples.map((s) => ({
        at: s.at,
        queueDepth: s.queueDepth,
        slotsUsed: s.slotsUsed,
        slotsTotal: s.slotsTotal,
        tickLatencyMs: s.tickLatencyMs,
      })),
      truncated,
    };
  }

  // ── Rollups (Phase 61 E) ─────────────────────────────────────────────────────

  /**
   * Read the stored metric rollups for a period over a window (defaults: the
   * trailing 30 buckets up to now). The rollup *job* (MetricsRollupService)
   * writes these on an interval; this read is pure. The transparent
   * rollup-vs-raw switch inside `/metrics/ops` is a documented follow-up.
   */
  getRollups(query: MetricsRollupQuery): MetricsRollupResponse {
    const to = query.to ?? new Date().toISOString();
    const spanMs = (query.period === 'hourly' ? 30 : 90) * DAY_MS;
    const from = query.from ?? new Date(Date.parse(to) - spanMs).toISOString();
    const rows = this.repo.listRollups(query.period, from, to, query.source);
    return {
      period: query.period,
      from,
      to,
      rows: rows.map(
        (r): MetricsRollup => ({
          key: r.key,
          period: r.period as MetricsRollup['period'],
          bucketStart: r.bucketStart,
          source: r.source as MetricsRollup['source'],
          repo: r.repo,
          provider: r.provider,
          model: r.model,
          runCount: r.runCount,
          doneCount: r.doneCount,
          abandonedCount: r.abandonedCount,
          failedCount: r.failedCount,
          cancelledCount: r.cancelledCount,
          totalDurationMs: r.totalDurationMs,
          retriedRuns: r.retriedRuns,
          calls: r.calls,
          inputTokens: r.inputTokens,
          outputTokens: r.outputTokens,
          estCostUsd: r.estCostUsd,
          avgQueueDepth: r.avgQueueDepth,
          avgSlotsUsed: r.avgSlotsUsed,
          avgTickLatencyMs: r.avgTickLatencyMs,
          sampleCount: r.sampleCount,
        }),
      ),
    };
  }

  // ── Run timeline (Phase 61 G) ────────────────────────────────────────────────

  /**
   * All agent runs for one task (oldest-first), mapped to the wire shape. A live
   * run keeps its null `endedAt`/`durationMs`/`outcome` — the client renders it
   * extending to "now". Read-only over `agent_run_stats`; no aggregation.
   */
  getRunTimeline(taskId: string): RunTimelineResponse {
    const rows = this.repo.runsForTask(taskId);
    return {
      taskId,
      runs: rows.map((r) => ({
        id: r.id,
        taskId: r.taskId,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        durationMs: r.durationMs,
        outcome: r.outcome as RunOutcome | null,
        retryCount: r.retryCount,
        repo: r.repo,
      })),
    };
  }

  // ── Cycle time (Phase 61 C) ──────────────────────────────────────────────────

  /**
   * Lifecycle cycle-time (wait / work / end-to-end) over the trailing window,
   * derived from the `status.changed` event stream and optionally grouped by
   * repo / project / priority. p50/p90 are nearest-rank. Per-task segments are
   * memoized (terminal tasks are immutable), and retry overhead is folded in from
   * `agent_run_stats`.
   */
  getCycleTime(query: CycleTimeQuery): CycleTimeResponse {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - query.windowDays * DAY_MS).toISOString();

    const rows = this.repo.cycleRows(from, to);
    const retry = this.repo.retryOverheadByTask();

    const accs = new Map<string, CycleAcc>();
    for (const row of rows) {
      const cycle = this.cycleFor(row);
      const key = groupKey(row, query.groupBy);
      let acc = accs.get(key);
      if (!acc) {
        acc = {
          key,
          taskCount: 0,
          wait: [],
          work: [],
          endToEnd: [],
          retryOverheadMsTotal: 0,
          tasksWithRetries: 0,
        };
        accs.set(key, acc);
      }
      acc.taskCount++;
      if (cycle.waitMs !== null) acc.wait.push(cycle.waitMs);
      if (cycle.workMs !== null) acc.work.push(cycle.workMs);
      acc.endToEnd.push(cycle.endToEndMs);
      const r = retry.get(row.id);
      if (r && r.retryAttempts > 0) {
        acc.retryOverheadMsTotal += r.retryOverheadMs;
        acc.tasksWithRetries++;
      }
    }

    const groups: CycleTimeGroup[] = [...accs.values()]
      .map((a) => ({
        key: a.key,
        taskCount: a.taskCount,
        wait: statOf(a.wait),
        work: statOf(a.work),
        endToEnd: statOf(a.endToEnd),
        retryOverheadMsTotal: a.retryOverheadMsTotal,
        tasksWithRetries: a.tasksWithRetries,
      }))
      .sort((x, y) => y.taskCount - x.taskCount || x.key.localeCompare(y.key));

    return { from, to, groupBy: query.groupBy, groups };
  }

  /** Cached segment derivation for one completed task (see `cycleCache`). */
  private cycleFor(row: DoneTaskCycleRow): TaskCycle {
    const cacheKey = `${row.id}@${row.doneAt}`;
    let cycle = this.cycleCache.get(cacheKey);
    if (!cycle) {
      cycle = deriveCycle(row.createdAt, row.firstWipAt, row.doneAt);
      this.cycleCache.set(cacheKey, cycle);
    }
    return cycle;
  }
}

/** Bucket a task into its group. `none` collapses everything into `all`. */
function groupKey(row: DoneTaskCycleRow, groupBy: CycleTimeGroupBy): string {
  switch (groupBy) {
    case 'repo':
      return row.repo ?? '(none)';
    case 'project':
      return row.projectId ?? '(none)';
    case 'priority':
      return String(row.priority);
    case 'none':
    default:
      return 'all';
  }
}
