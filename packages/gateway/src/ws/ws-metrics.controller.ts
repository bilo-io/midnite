import { Controller, Get, Inject } from '@nestjs/common';
import type { WsMetricsResponse } from '@midnite/shared';
import { WsMetricsService } from './ws-metrics.service';

/**
 * Phase 56 C — read the realtime transport health counters (open; the board can
 * surface a connection/health readout later — Theme E).
 */
@Controller('ws/metrics')
export class WsMetricsController {
  constructor(@Inject(WsMetricsService) private readonly metrics: WsMetricsService) {}

  @Get()
  get(): WsMetricsResponse {
    return { metrics: this.metrics.snapshot() };
  }
}
