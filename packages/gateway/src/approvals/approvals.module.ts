import { Module, forwardRef } from '@nestjs/common';
import { TerminalModule } from '../terminal/terminal.module';
import { ApprovalLogRepository } from './approval-log.repository';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsGateway } from './approvals.gateway';
import { ApprovalsSettingsController } from './approvals-settings.controller';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [forwardRef(() => TerminalModule)],
  controllers: [ApprovalsController, ApprovalsSettingsController],
  providers: [ApprovalsService, ApprovalsRepository, ApprovalLogRepository, ApprovalsGateway],
  exports: [ApprovalsService, ApprovalsRepository, ApprovalLogRepository],
})
export class ApprovalsModule {}
