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
} from '@midnite/shared';
import { ApprovalsService } from './approvals.service';

@Controller('approvals/rules')
export class ApprovalsController {
  constructor(@Inject(ApprovalsService) private readonly service: ApprovalsService) {}

  @Get()
  list(): ApprovalRulesResponse {
    return { rules: this.service.list() };
  }

  @Get(':id')
  get(@Param('id') id: string): ApprovalRuleResponse {
    return { rule: this.service.get(id) };
  }

  @Post()
  create(@Body() body: unknown): ApprovalRuleResponse {
    const parsed = CreateApprovalRuleSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { rule: this.service.create(parsed.data) };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown): ApprovalRuleResponse {
    const parsed = UpdateApprovalRuleSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { rule: this.service.update(id, parsed.data) };
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): void {
    this.service.remove(id);
  }
}
