import { Module } from '@nestjs/common';

import { MetricsController } from './metrics.controller';
import { MetricsRepository } from './metrics.repository';
import { MetricsService } from './metrics.service';

// Ops metrics: per-run history (MetricsRepository) + live gauges (GaugeStore
// owned by MetricsService). MetricsService is exported so the scheduler, pool,
// and runner can call record* without importing metrics internals.
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsRepository],
  exports: [MetricsService],
})
export class MetricsModule {}
