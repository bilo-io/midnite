import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { MidniteConfig } from '@midnite/shared';

import { MIDNITE_CONFIG } from '../config.token';
import { MetricsService } from './metrics.service';

/**
 * Phase 61 D — persists a snapshot of the live gauges every
 * `metrics.sampleIntervalMs` so fleet-trend history survives a gateway restart
 * (the in-memory GaugeStore is lost on boot by design).
 *
 * A single gateway-owned loop (mirrors P49's BackupSchedulerService: one
 * `setInterval` + `unref` + a reentrancy guard), **fail-open** — a failed sample
 * logs `warn` and never throws into the timer. After each write it self-prunes
 * gauge samples older than `metrics.rawRetentionDays` so the table stays bounded
 * before Theme E generalizes retention/rollups. `sampleIntervalMs = 0` disables
 * the loop entirely (no timer, no rows) — behaviour-preserving opt-out.
 */
@Injectable()
export class MetricsSamplerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsSamplerService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  onModuleInit(): void {
    const { sampleIntervalMs, rawRetentionDays } = this.config.metrics;
    if (sampleIntervalMs <= 0) {
      this.logger.log('gauge sampler disabled (metrics.sampleIntervalMs = 0)');
      return;
    }
    this.timer = setInterval(() => this.tick(), sampleIntervalMs);
    this.timer.unref?.();
    this.logger.log(
      `gauge sampler started (every ${sampleIntervalMs}ms, retain ${rawRetentionDays}d)`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One sample + prune. Public + synchronous so tests can drive it directly.
   *  Fail-open: never throws (a reentrancy guard also skips overlapping runs). */
  tick(): void {
    if (this.running) return;
    this.running = true;
    try {
      const wrote = this.metrics.sampleGauges();
      if (wrote) this.metrics.pruneGaugeSamples(this.config.metrics.rawRetentionDays);
    } catch (err) {
      this.logger.warn(`gauge sample failed (ignored): ${err instanceof Error ? err.message : err}`);
    } finally {
      this.running = false;
    }
  }
}
