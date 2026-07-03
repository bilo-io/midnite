import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateApprovalRuleSchema,
  UpdateApprovalRuleSchema,
  type ApprovalRuleResponse,
  type ApprovalRulesResponse,
  type PendingApprovalsResponse,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { ApprovalService } from '../terminal/approval.service';
import { ApprovalsService } from './approvals.service';

/**
 * Approval rules are blast-radius controls (allow/deny a tool). Reading them is
 * open (the Settings page shows the policy); **editing** is an admin action
 * (Phase 50 D) and audited — the actor is threaded from the JWT.
 */
@Controller('approvals')
export class ApprovalsController {
  constructor(
    @Inject(ApprovalsService) private readonly service: ApprovalsService,
    @Inject(ApprovalService) private readonly approvalService: ApprovalService,
  ) {}

  // ---- pending (Theme B) ----

  @Get('pending')
  listPending(): PendingApprovalsResponse {
    return { pending: this.approvalService.listPending() };
  }

  // ---- rules (Theme A) ----

  @Get('rules')
  listRules(): ApprovalRulesResponse {
    return { rules: this.service.list() };
  }

  @Get('rules/:id')
  getRule(@Param('id') id: string): ApprovalRuleResponse {
    return { rule: this.service.get(id) };
  }

  @Post('rules')
  @RequiresRole('admin')
  createRule(@Body() body: unknown, @CurrentUser() user?: CurrentUserPayload | null): ApprovalRuleResponse {
    const parsed = CreateApprovalRuleSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { rule: this.service.create(parsed.data, user?.userId ?? null) };
  }

  @Patch('rules/:id')
  @RequiresRole('admin')
  updateRule(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): ApprovalRuleResponse {
    const parsed = UpdateApprovalRuleSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { rule: this.service.update(id, parsed.data, user?.userId ?? null) };
  }

  @Delete('rules/:id')
  @RequiresRole('admin')
  @HttpCode(204)
  removeRule(@Param('id') id: string, @CurrentUser() user?: CurrentUserPayload | null): void {
    this.service.remove(id, user?.userId ?? null);
  }
}
