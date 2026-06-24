import { Module } from '@nestjs/common';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';

/** Phase 23: durable tool-approval rules. CRUD surface for `approval_rules`;
 *  the evaluation engine (A2) and audit log (C) extend this module in later slices. */
@Module({
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ApprovalsRepository],
  exports: [ApprovalsService, ApprovalsRepository],
})
export class ApprovalsModule {}
