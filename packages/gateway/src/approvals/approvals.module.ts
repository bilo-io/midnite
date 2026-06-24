import { Module } from '@nestjs/common';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsSettingsController } from './approvals-settings.controller';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';

@Module({
  controllers: [ApprovalsController, ApprovalsSettingsController],
  providers: [ApprovalsService, ApprovalsRepository],
  exports: [ApprovalsService, ApprovalsRepository],
})
export class ApprovalsModule {}
