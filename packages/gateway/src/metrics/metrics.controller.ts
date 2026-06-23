import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import { OpsQuerySchema, type OpsSummary } from '@midnite/shared';

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
}
