import { homedir } from 'node:os';

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ReposModule } from '../repos/repos.module';
import { WorkflowCredentialsModule } from '../workflows/credentials/workflow-credentials.module';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { GithubTokenModule } from './github-token.module';
import { GithubTokenService } from './github-token.service';
import { GITHUB_FETCH_OPTIONS, GITHUB_HOME_DIR } from './github.tokens';

/**
 * Connected GitHub (Phase 84). Theme B ships repo discovery; Themes E/F add the
 * Projects v2 GraphQL surface into this same module.
 *
 * `ConfigModule` is `@Global`, so `MIDNITE_CONFIG` resolves without importing it. The
 * token ladder lives in its own {@link GithubTokenModule} (Theme A) because
 * `TasksModule` resolves through it too; it's re-exported here so a consumer of this
 * module gets both without a second import.
 */
@Module({
  imports: [AuthModule, ReposModule, WorkflowCredentialsModule, GithubTokenModule],
  controllers: [GithubController],
  providers: [
    GithubService,
    // The environment seams, bound to their real values. Explicit providers rather than
    // `@Optional()` params so a wiring mistake fails loudly at boot.
    { provide: GITHUB_FETCH_OPTIONS, useValue: {} },
    { provide: GITHUB_HOME_DIR, useValue: homedir() },
  ],
  exports: [GithubService, GithubTokenService],
})
export class GithubModule {}
