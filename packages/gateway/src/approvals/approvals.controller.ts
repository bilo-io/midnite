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
  Query,
} from '@nestjs/common';
import {
  CreateApprovalRuleSchema,
  SetModeRequestSchema,
  UpdateApprovalRuleSchema,
  type ApprovalLogResponse,
  type ApprovalRuleResponse,
  type ApprovalRulesResponse,
  type ModeResponse,
  type PendingApprovalsResponse,
} from '@midnite/shared';
import { ApprovalService } from '../terminal/approval.service';
import { ApprovalsLogRepository, type LogListOpts } from './approvals-log.repository';
import { ApprovalsService } from './approvals.service';

@Controller('approvals')
export class ApprovalsController {
  constructor(
    @Inject(ApprovalsService) private readonly service: ApprovalsService,
    @Inject(ApprovalService) private readonly approvalService: ApprovalService,
    @Inject(ApprovalsLogRepository) private readonly logRepo: ApprovalsLogRepository,
  ) {}

  // ---- mode (Theme D) ----

  @Get('mode')
  getMode(): ModeResponse {
    return { mode: this.service.getMode() };
  }

  @Patch('mode')
  setMode(@Body() body: unknown): ModeResponse {
    const parsed = SetModeRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    this.service.setMode(parsed.data.mode);
    return { mode: this.service.getMode() };
  }

  // ---- pending (Theme B) ----

  @Get('pending')
  listPending(): PendingApprovalsResponse {
    return { pending: this.approvalService.listPending() };
  }

  // ---- audit log (Theme C) ----

  @Get('log')
  getLog(
    @Query('sessionId') sessionId?: string,
    @Query('taskId') taskId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ): ApprovalLogResponse {
    const opts: LogListOpts = {
      sessionId,
      taskId,
      from,
      to,
      limit: limitStr ? parseInt(limitStr, 10) : 50,
      offset: offsetStr ? parseInt(offsetStr, 10) : 0,
    };
    const { entries, total } = this.logRepo.list(opts);
    return { entries, total, limit: opts.limit ?? 50, offset: opts.offset ?? 0 };
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
