import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { promisify } from 'node:util';

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ReposModule } from '../repos/repos.module';
import { WorkflowCredentialsModule } from '../workflows/credentials/workflow-credentials.module';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { GithubTokenService } from './github-token.service';
import { GITHUB_EXEC_FILE, GITHUB_FETCH_OPTIONS, GITHUB_HOME_DIR } from './github.tokens';

/**
 * Connected GitHub (Phase 84). Theme B ships repo discovery; Themes E/F add the
 * Projects v2 GraphQL surface into this same module.
 *
 * `ConfigModule` is `@Global`, so `MIDNITE_CONFIG` resolves without importing it.
 * `GithubTokenService` is exported because it is the ladder every future GitHub caller
 * should resolve through — Theme A repoints `pr-review.service.ts`'s local
 * `githubToken()` at it rather than growing a second one.
 */
@Module({
  imports: [AuthModule, ReposModule, WorkflowCredentialsModule],
  controllers: [GithubController],
  providers: [
    GithubService,
    GithubTokenService,
    // The environment seams, bound to their real values. Explicit providers rather than
    // `@Optional()` params so a wiring mistake fails loudly at boot.
    { provide: GITHUB_FETCH_OPTIONS, useValue: {} },
    { provide: GITHUB_HOME_DIR, useValue: homedir() },
    { provide: GITHUB_EXEC_FILE, useValue: promisify(execFile) },
  ],
  exports: [GithubService, GithubTokenService],
})
export class GithubModule {}
