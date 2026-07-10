import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import {
  CycleTimeQuerySchema,
  GaugeHistoryQuerySchema,
  MetricsRollupQuerySchema,
  OpsQuerySchema,
  type CycleTimeResponse,
  type GaugeHistoryResponse,
  type MetricsRollupResponse,
  type OpsSummary,
} from '@midnite/shared';

import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(@Inject(MetricsService) private readonly service: MetricsService) {}

  // GET /metrics/ops?from=<iso>&to=<iso>
  @Get('ops')
  ops(@Query() query: unknown): OpsSummary {
    const parsed = OpsQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.getOpsSummary(parsed.data);
  }

  // GET /metrics/gauges/history?from=<iso>&to=<iso> — persisted gauge samples
  // for the fleet-trend charts (Phase 61 D). Bounded + `truncated` flagged.
  @Get('gauges/history')
  gaugeHistory(@Query() query: unknown): GaugeHistoryResponse {
    const parsed = GaugeHistoryQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.getGaugeHistory(parsed.data);
  }

  // GET /metrics/cycle-time?groupBy=none|repo|project|priority&windowDays=<n>
  // Lifecycle cycle-time (wait/work/end-to-end p50/p90) from the task-event stream (Phase 61 C).
  @Get('cycle-time')
  cycleTime(@Query() query: unknown): CycleTimeResponse {
    const parsed = CycleTimeQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.getCycleTime(parsed.data);
  }

  // GET /metrics/rollups?period=hourly|daily&from=<iso>&to=<iso>&source=runs|llm|session|gauge
  // Aggregated rollup buckets (Phase 61 E), oldest-first. Kept forever; the raw
  // tables they summarise are pruned past metrics.rawRetentionDays.
  @Get('rollups')
  rollups(@Query() query: unknown): MetricsRollupResponse {
    const parsed = MetricsRollupQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.getRollups(parsed.data);
  }
}
