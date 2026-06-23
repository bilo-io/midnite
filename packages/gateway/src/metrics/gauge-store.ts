/**
 * In-memory rolling-window gauge store for Phase 22 A2.
 *
 * Holds the three fast-moving operational signals that are too high-frequency
 * to persist in `agent_run_stats`:
 *   - queue depth   — ready `todo` task count, sampled each scheduler tick
 *   - slot state    — how many agent slots are used vs. the pool capacity
 *   - tick latency  — how long the last scheduler tick took (wall-clock ms)
 *
 * All values are lost on restart by design (Decision §1). The store is a plain
 * class, not a Nest service, so it can be unit-tested and composed freely; the
 * MetricsService (Theme A3) wraps it and registers it in the DI graph.
 *
 * Callers (`MetricsService.record*`) are the only writers — the scheduler, pool,
 * and runner call `metrics.record*`, never touching the store directly.
 */
export interface SlotSnapshot {
  used: number;
  total: number;
}

export interface GaugeSnapshot {
  queueDepth: number | null;
  slots: SlotSnapshot | null;
  lastTickLatencyMs: number | null;
  updatedAt: string | null;
}

export class GaugeStore {
  private queueDepth: number | null = null;
  private slots: SlotSnapshot | null = null;
  private lastTickLatencyMs: number | null = null;
  private updatedAt: string | null = null;

  recordQueueDepth(depth: number, at: string): void {
    this.queueDepth = depth;
    this.updatedAt = at;
  }

  recordSlotChange(used: number, total: number, at: string): void {
    this.slots = { used, total };
    this.updatedAt = at;
  }

  recordTickLatency(ms: number, at: string): void {
    this.lastTickLatencyMs = ms;
    this.updatedAt = at;
  }

  snapshot(): GaugeSnapshot {
    return {
      queueDepth: this.queueDepth,
      slots: this.slots ? { ...this.slots } : null,
      lastTickLatencyMs: this.lastTickLatencyMs,
      updatedAt: this.updatedAt,
    };
  }
}
