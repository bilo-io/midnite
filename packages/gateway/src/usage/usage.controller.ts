import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import {
  UsageAttributionQuerySchema,
  UsageSummaryQuerySchema,
  type UsageAttributionResponse,
  type UsageSummaryResponse,
} from '@midnite/shared';
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

  // GET /usage/attribution?from=&to=&groupBy=task|repo|project|session (Phase 61 B)
  @Get('attribution')
  attribution(@Query() query: unknown): UsageAttributionResponse {
    const parsed = UsageAttributionQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.attribution(parsed.data);
  }
}
