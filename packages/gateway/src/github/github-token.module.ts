import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { Module } from '@nestjs/common';

import { WorkflowCredentialsModule } from '../workflows/credentials/workflow-credentials.module';
import { GithubTokenService } from './github-token.service';
import { GITHUB_EXEC_FILE } from './github.tokens';

/**
 * The GitHub token ladder on its own, so more than one feature can resolve through it.
 *
 * Its own module rather than an export of `GithubModule` because `TasksModule` needs it
 * (Phase 84 Theme A repoints `pr-review.service.ts`'s first-match-wins `githubToken()`
 * here) and pulling in all of `GithubModule` — which imports `ReposModule` — to get one
 * service is both more than is needed and a standing invitation to a cycle.
 *
 * Deliberately narrow: it imports only the credential vault it reads from.
 */
@Module({
  imports: [WorkflowCredentialsModule],
  providers: [GithubTokenService, { provide: GITHUB_EXEC_FILE, useValue: promisify(execFile) }],
  exports: [GithubTokenService],
})
export class GithubTokenModule {}
