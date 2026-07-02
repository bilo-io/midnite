import { Module, forwardRef } from '@nestjs/common';
import { TerminalModule } from '../terminal/terminal.module';
import { TasksModule } from '../tasks/tasks.module';
import { ApprovalLogRepository } from './approval-log.repository';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsSettingsController } from './approvals-settings.controller';
import { ApprovalsGateway } from './approvals.gateway';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';
import { GuardrailsController } from './guardrails.controller';

/** Phase 23: durable tool-approval rules, live inbox, audit log, and autonomy mode.
 *
 * forwardRef resolves the TerminalModule ↔ ApprovalsModule cycle:
 * TerminalModule imports ApprovalsModule (for ApprovalsService in ApprovalService);
 * ApprovalsModule imports TerminalModule (for ApprovalService/ApprovalEventBus in
 * ApprovalsController and ApprovalsGateway). */
@Module({
  imports: [forwardRef(() => TerminalModule), TasksModule],
  controllers: [ApprovalsController, ApprovalsSettingsController, GuardrailsController],
  providers: [ApprovalsService, ApprovalsRepository, ApprovalLogRepository, ApprovalsGateway],
  exports: [ApprovalsService, ApprovalsRepository, ApprovalLogRepository],
})
export class ApprovalsModule {}
