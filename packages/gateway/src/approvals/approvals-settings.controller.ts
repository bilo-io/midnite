import { BadRequestException, Body, Controller, Get, Inject, Patch, Query } from '@nestjs/common';
import {
  ApprovalLogQuerySchema,
  ApprovalLogResponseSchema,
  SetModeRequestSchema,
  type ApprovalLogResponse,
  type ApprovalSettings,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { ApprovalsService } from './approvals.service';

@Controller('approvals')
export class ApprovalsSettingsController {
  constructor(@Inject(ApprovalsService) private readonly service: ApprovalsService) {}

  @Get('settings')
  getSettings(): ApprovalSettings {
    return this.service.getSettings();
  }

  // The autonomy policy mode is a guardrail — changing it is an admin action
  // (Phase 50 D) and audited with a from→to diff.
  @Patch('mode')
  @RequiresRole('admin')
  setMode(@Body() body: unknown, @CurrentUser() user?: CurrentUserPayload | null): ApprovalSettings {
    const parsed = SetModeRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    this.service.setMode(parsed.data.mode, user?.userId ?? null);
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
