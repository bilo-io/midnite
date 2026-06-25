import { Module } from '@nestjs/common';
import { ApprovalLogRepository } from './approval-log.repository';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsSettingsController } from './approvals-settings.controller';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';

@Module({
  controllers: [ApprovalsController, ApprovalsSettingsController],
  providers: [ApprovalsService, ApprovalsRepository, ApprovalLogRepository],
  exports: [ApprovalsService, ApprovalsRepository, ApprovalLogRepository],
})
export class ApprovalsModule {}
