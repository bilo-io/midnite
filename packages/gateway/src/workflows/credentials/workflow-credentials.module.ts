import { Module } from '@nestjs/common';
import { WorkflowCredentialsController } from './workflow-credentials.controller';
import { WorkflowCredentialsRepository } from './workflow-credentials.repository';
import { WorkflowCredentialsService } from './workflow-credentials.service';

// The workflow credential vault. CryptoModule + DbModule are @Global, so the repo's
// DB_TOKEN / CryptoService deps resolve without explicit imports. The service is
// exported so workflow executors can resolve credentials server-side at run time.
@Module({
  controllers: [WorkflowCredentialsController],
  providers: [WorkflowCredentialsService, WorkflowCredentialsRepository],
  exports: [WorkflowCredentialsService],
})
export class WorkflowCredentialsModule {}
