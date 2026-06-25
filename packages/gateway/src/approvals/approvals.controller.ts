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
import { ApprovalService } from '../terminal/approval.service';
import { ApprovalsService } from './approvals.service';

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
  createRule(@Body() body: unknown): ApprovalRuleResponse {
    const parsed = CreateApprovalRuleSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { rule: this.service.create(parsed.data) };
  }

  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() body: unknown): ApprovalRuleResponse {
    const parsed = UpdateApprovalRuleSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { rule: this.service.update(id, parsed.data) };
  }

  @Delete('rules/:id')
  @HttpCode(204)
  removeRule(@Param('id') id: string): void {
    this.service.remove(id);
  }
}
