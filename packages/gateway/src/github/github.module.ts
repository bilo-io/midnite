import { homedir } from 'node:os';

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ReposModule } from '../repos/repos.module';
import { WorkflowCredentialsModule } from '../workflows/credentials/workflow-credentials.module';
import { TasksCoreModule } from '../tasks/tasks-core.module';
import { GithubController } from './github.controller';
import { GithubProjectItemsRepository } from './github-project-items.repository';
import { GithubProjectsController } from './github-projects.controller';
import { GithubProjectsService } from './github-projects.service';
import { GithubService } from './github.service';
import { GithubTokenModule } from './github-token.module';
import { GITHUB_FETCH_OPTIONS, GITHUB_HOME_DIR } from './github.tokens';

/**
 * Connected GitHub (Phase 84). Theme B ships repo discovery; Themes E/F add the
 * Projects v2 GraphQL surface into this same module.
 *
 * `ConfigModule` is `@Global`, so `MIDNITE_CONFIG` resolves without importing it. The
 * token ladder lives in its own {@link GithubTokenModule} (Theme A) because
 * `TasksModule` resolves through it too; the **module** is re-exported here so a
 * consumer of this one gets both without a second import.
 *
 * Re-exporting `GithubTokenModule` rather than `GithubTokenService`: Nest can only
 * export a provider a module actually declares, so listing the service here — which
 * this module imports rather than provides — aborts the whole bootstrap with
 * "cannot export a provider/module that is not a part of the currently processed
 * module". Nothing in the unit suite catches it, because nothing there builds the
 * real container.
 */
@Module({
  imports: [AuthModule, ReposModule, WorkflowCredentialsModule, GithubTokenModule, TasksCoreModule],
  controllers: [GithubController, GithubProjectsController],
  providers: [
    GithubService,
    GithubProjectsService,
    GithubProjectItemsRepository,
    // The environment seams, bound to their real values. Explicit providers rather than
    // `@Optional()` params so a wiring mistake fails loudly at boot.
    { provide: GITHUB_FETCH_OPTIONS, useValue: {} },
    { provide: GITHUB_HOME_DIR, useValue: homedir() },
  ],
  exports: [GithubService, GithubProjectsService, GithubTokenModule],
})
export class GithubModule {}
