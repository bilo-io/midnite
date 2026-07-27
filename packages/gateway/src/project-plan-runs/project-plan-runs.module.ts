import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { ProjectDocsModule } from '../project-docs/project-docs.module';
import { ProjectsModule } from '../projects/projects.module';
import { TerminalModule } from '../terminal/terminal.module';
import { ProjectPlanRunnerService } from './project-plan-runner.service';
import { ProjectPlanRunsController } from './project-plan-runs.controller';
import { ProjectPlanRunsRepository } from './project-plan-runs.repository';

// Draft-plan Stage 1: a one-shot CLI run in a managed PTY (TerminalModule),
// seeded from a project's (ProjectsModule) description/plan and optionally the
// content of its docs (ProjectDocsModule). A small sibling module rather than
// folded into ProjectsModule/ProjectDocsModule — ProjectDocsModule already
// depends one-directionally on ProjectsModule, so this needs both without
// introducing a cycle in either.
@Module({
  imports: [ProjectsModule, ProjectDocsModule, AgentsModule, TerminalModule],
  controllers: [ProjectPlanRunsController],
  providers: [ProjectPlanRunnerService, ProjectPlanRunsRepository],
  exports: [ProjectPlanRunnerService],
})
export class ProjectPlanRunsModule {}
