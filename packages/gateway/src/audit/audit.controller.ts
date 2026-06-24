import { Controller, Get, Query } from '@nestjs/common';
import type { AuditListResponse } from '@midnite/shared';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  list(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
  ): AuditListResponse {
    const limit = limitRaw ? Math.min(200, Math.max(1, Number(limitRaw) || 50)) : 50;
    const offset = offsetRaw ? Math.max(0, Number(offsetRaw) || 0) : 0;
    return this.service.list({ entityType, entityId, userId, action, from, to, limit, offset });
  }
}
