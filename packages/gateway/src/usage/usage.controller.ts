import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import { UsageSummaryQuerySchema, type UsageSummaryResponse } from '@midnite/shared';
import { UsageService } from './usage.service';

@Controller('usage')
export class UsageController {
  constructor(@Inject(UsageService) private readonly service: UsageService) {}

  // GET /usage/summary?from=&to=&groupBy=day|provider|feature
  @Get('summary')
  summary(@Query() query: unknown): UsageSummaryResponse {
    const parsed = UsageSummaryQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.summary(parsed.data);
  }
}
