import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { WorkflowCredentialsController } from './workflow-credentials.controller';
import { WorkflowCredentialsRepository } from './workflow-credentials.repository';
import { WorkflowCredentialsService } from './workflow-credentials.service';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

// The workflow credential vault + OAuth2 flow. CryptoModule + DbModule are @Global,
// so the repo's DB_TOKEN / CryptoService deps resolve without explicit imports.
// The service is exported so workflow executors can resolve credentials server-side.
//
// OAuthService has a cross-dependency with WorkflowCredentialsService (refresh writes
// back a new credential row). We break the circular dep with a manual setter called
// in onModuleInit after both services are instantiated.
@Module({
  controllers: [WorkflowCredentialsController, OAuthController],
  providers: [WorkflowCredentialsService, WorkflowCredentialsRepository, OAuthService],
  exports: [WorkflowCredentialsService],
})
export class WorkflowCredentialsModule implements OnModuleInit {
  constructor(
    @Inject(WorkflowCredentialsService)
    private readonly credService: WorkflowCredentialsService,
    @Inject(OAuthService)
    private readonly oauthService: OAuthService,
  ) {}

  onModuleInit(): void {
    this.credService.setOAuthService(this.oauthService);
  }
}
