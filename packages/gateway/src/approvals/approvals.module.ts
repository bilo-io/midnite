import { Module, forwardRef } from '@nestjs/common';
import { TerminalModule } from '../terminal/terminal.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsSettingsController } from './approvals-settings.controller';
import { ApprovalsGateway } from './approvals.gateway';
import { ApprovalsLogRepository } from './approvals-log.repository';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';

/** Phase 23: durable tool-approval rules, live inbox, audit log, and autonomy mode.
 *
 * forwardRef resolves the TerminalModule ↔ ApprovalsModule cycle:
 * TerminalModule imports ApprovalsModule (for ApprovalsService in ApprovalService);
 * ApprovalsModule imports TerminalModule (for ApprovalService/ApprovalEventBus in
 * ApprovalsController and ApprovalsGateway). */
@Module({
  imports: [forwardRef(() => TerminalModule)],
  controllers: [ApprovalsController, ApprovalsSettingsController],
  providers: [ApprovalsService, ApprovalsRepository, ApprovalsLogRepository, ApprovalsGateway],
  exports: [ApprovalsService, ApprovalsRepository, ApprovalsLogRepository],
})
export class ApprovalsModule {}
