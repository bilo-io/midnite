import { BadRequestException, Body, Controller, Get, Inject, Patch, Query } from '@nestjs/common';
import {
  ApprovalLogQuerySchema,
  ApprovalLogResponseSchema,
  SetModeRequestSchema,
  type ApprovalLogResponse,
  type ApprovalSettings,
} from '@midnite/shared';
import { ApprovalsService } from './approvals.service';

@Controller('approvals')
export class ApprovalsSettingsController {
  constructor(@Inject(ApprovalsService) private readonly service: ApprovalsService) {}

  @Get('settings')
  getSettings(): ApprovalSettings {
    return this.service.getSettings();
  }

  @Patch('mode')
  setMode(@Body() body: unknown): ApprovalSettings {
    const parsed = SetModeRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    this.service.setMode(parsed.data.mode);
    return this.service.getSettings();
  }

  @Get('log')
  getLog(@Query() query: unknown): ApprovalLogResponse {
    const parsed = ApprovalLogQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const result = this.service.listLog(parsed.data);
    return ApprovalLogResponseSchema.parse(result);
  }
}
