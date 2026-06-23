import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import { OpsQuerySchema, OpsSummaryResponseSchema, type OpsSummaryResponse } from '@midnite/shared';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(@Inject(MetricsService) private readonly service: MetricsService) {}

  @Get('ops')
  getOps(@Query('from') from?: string, @Query('to') to?: string): OpsSummaryResponse {
    const parsed = OpsQuerySchema.safeParse({ from, to });
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const ops = this.service.getOpsSummary(parsed.data);
    return OpsSummaryResponseSchema.parse({ ops });
  }
}
