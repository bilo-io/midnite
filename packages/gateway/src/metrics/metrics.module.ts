import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MetricsController } from './metrics.controller';
import { MetricsEventBus } from './metrics-event-bus';
import { MetricsGateway } from './metrics.gateway';
import { MetricsRepository } from './metrics.repository';
import { MetricsRollupService } from './metrics-rollup.service';
import { MetricsSamplerService } from './metrics-sampler.service';
import { MetricsService } from './metrics.service';

// Ops metrics: per-run history (MetricsRepository) + live gauges (GaugeStore
// owned by MetricsService). MetricsService is exported so the scheduler, pool,
// and runner can call record* without importing metrics internals. The sampler
// (Phase 61 D) persists gauge snapshots on an interval for restart-surviving
// trend history; the rollup service (Phase 61 E) aggregates closed buckets +
// prunes rolled-up raw rows so history stays bounded. The gateway (Phase 61 F)
// pushes live gauge snapshots over the reliable WS via MetricsEventBus, which
// MetricsService emits to on every gauge change. AuthModule supplies the
// optional JwtService for token-scoped connections (ReliableBroadcastService /
// ConnectionRegistry / WsMetricsService come from the @Global WsModule).
@Module({
  imports: [AuthModule],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    MetricsRepository,
    MetricsSamplerService,
    MetricsRollupService,
    MetricsEventBus,
    MetricsGateway,
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
