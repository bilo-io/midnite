import { Module } from '@nestjs/common';

import { MetricsController } from './metrics.controller';
import { MetricsRepository } from './metrics.repository';
import { MetricsRollupService } from './metrics-rollup.service';
import { MetricsSamplerService } from './metrics-sampler.service';
import { MetricsService } from './metrics.service';

// Ops metrics: per-run history (MetricsRepository) + live gauges (GaugeStore
// owned by MetricsService). MetricsService is exported so the scheduler, pool,
// and runner can call record* without importing metrics internals. The sampler
// (Phase 61 D) persists gauge snapshots on an interval for restart-surviving
// trend history; the rollup service (Phase 61 E) aggregates closed buckets +
// prunes rolled-up raw rows so history stays bounded.
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsRepository, MetricsSamplerService, MetricsRollupService],
  exports: [MetricsService],
})
export class MetricsModule {}
