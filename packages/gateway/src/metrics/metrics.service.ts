import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  GAUGE_HISTORY_MAX_POINTS,
  type GaugeHistoryQuery,
  type GaugeHistoryResponse,
  type MetricsGauges,
  type OpsSummary,
  type OpsQuery,
} from '@midnite/shared';

import { MetricsRepository } from './metrics.repository';
import { GaugeStore } from './gauge-store';

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

  constructor(private readonly repo: MetricsRepository) {}

  // ── Gauge setters (called by scheduler / pool / runner) ─────────────────────

  recordQueueDepth(depth: number): void {
    this.gauges.recordQueueDepth(depth, new Date().toISOString());
  }

  recordSlotChange(used: number, total: number): void {
    this.gauges.recordSlotChange(used, total, new Date().toISOString());
  }

  recordTickLatency(ms: number): void {
    this.gauges.recordTickLatency(ms, new Date().toISOString());
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

    const snap = this.gauges.snapshot();
    const gauges: MetricsGauges = {
      queueDepth: snap.queueDepth,
      slotsUsed: snap.slots?.used ?? null,
      slotsTotal: snap.slots?.total ?? null,
      lastTickLatencyMs: snap.lastTickLatencyMs,
      updatedAt: snap.updatedAt,
    };

    return {
      gauges,
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
}
