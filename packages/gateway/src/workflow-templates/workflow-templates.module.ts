import { Module } from '@nestjs/common';
import { WorkflowsModule } from '../workflows/workflows.module';
import { WorkflowCredentialsModule } from '../workflows/credentials/workflow-credentials.module';
import { WorkflowTemplatesController } from './workflow-templates.controller';
import { WorkflowTemplatesService } from './workflow-templates.service';
import { WorkflowTemplatesRepository } from './workflow-templates.repository';

@Module({
  imports: [WorkflowsModule, WorkflowCredentialsModule],
  controllers: [WorkflowTemplatesController],
  providers: [WorkflowTemplatesService, WorkflowTemplatesRepository],
  exports: [WorkflowTemplatesService],
})
export class WorkflowTemplatesModule {}
