import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import {
  GaugeHistoryQuerySchema,
  OpsQuerySchema,
  type GaugeHistoryResponse,
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
}
