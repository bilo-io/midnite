import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { MidniteConfig, RollupPeriod } from '@midnite/shared';

import { MIDNITE_CONFIG } from '../config.token';
import { MetricsRepository } from './metrics.repository';
import { currentBucketStart, isoDaysBefore, rollupKey } from './lib/rollup';

const PERIODS: RollupPeriod[] = ['hourly', 'daily'];

/**
 * Phase 61 E — aggregates closed metric buckets into `metrics_rollup` and prunes
 * the raw rows they summarise, so history stays bounded without losing the truth.
 *
 * A single gateway-owned loop (mirrors the Theme-D sampler / P49 BackupScheduler:
 * one `setInterval` + `unref` + a reentrancy guard), **fail-open** — a failed
 * rollup logs `warn` and never throws into the timer. Runs once at boot (so a
 * restart rolls up recent history immediately) then every `rollupIntervalMs`.
 * Aggregation is idempotent (upsert by a deterministic key), so overlapping
 * windows across ticks converge. `rollupIntervalMs = 0` disables the loop
 * entirely (no aggregation, no pruning) — behaviour-preserving opt-out.
 */
@Injectable()
export class MetricsRollupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsRollupService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(MetricsRepository) private readonly repo: MetricsRepository,
  ) {}

  onModuleInit(): void {
    const { rollupIntervalMs, rawRetentionDays } = this.config.metrics;
    if (rollupIntervalMs <= 0) {
      this.logger.log('metrics rollup disabled (metrics.rollupIntervalMs = 0)');
      return;
    }
    this.tick();
    this.timer = setInterval(() => this.tick(), rollupIntervalMs);
    this.timer.unref?.();
    this.logger.log(
      `metrics rollup started (every ${rollupIntervalMs}ms, retain raw ${rawRetentionDays}d)`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * One aggregation + prune pass. Public + synchronous (a fixed `nowIso` is
   * injectable) so tests can drive it deterministically. Fail-open: never throws.
   */
  tick(nowIso: string = new Date().toISOString()): void {
    if (this.running) return;
    this.running = true;
    try {
      const retentionDays = this.config.metrics.rawRetentionDays;
      // Aggregate a window that fully covers what this tick will prune, so every
      // pruned row was rolled up in the same pass (belt-and-suspenders on top of
      // prior ticks having already rolled older buckets).
      const lookbackDays = retentionDays > 0 ? retentionDays + 1 : 2;
      const since = isoDaysBefore(nowIso, lookbackDays);
      for (const period of PERIODS) {
        const before = currentBucketStart(nowIso, period);
        const agg = this.repo.aggregateForRollup(period, since, before);
        const rows = agg.map((r) => ({ ...r, key: rollupKey(r), createdAt: nowIso }));
        this.repo.upsertRollups(rows);
      }
      // Retention: drop raw rows past the window (now rolled up). 0 = keep forever.
      if (retentionDays > 0) {
        this.repo.pruneRawBefore(isoDaysBefore(nowIso, retentionDays));
      }
    } catch (err) {
      this.logger.warn(`metrics rollup failed (ignored): ${err instanceof Error ? err.message : err}`);
    } finally {
      this.running = false;
    }
  }
}
