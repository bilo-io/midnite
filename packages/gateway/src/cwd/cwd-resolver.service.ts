import { homedir } from 'node:os';

import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Task } from '@midnite/shared';

import { AgentsService } from '../agents/agents.service';
import { expandTilde } from '../fs/path-tilde';
import { ProjectsRepository } from '../projects/projects.repository';
import { ReposService } from '../repos/repos.service';
import { pickSessionCwd } from './lib/resolve-cwd';

/** The parts of a task that decide where it runs. */
export type CwdTask = Pick<Task, 'id' | 'projectId' | 'repo'>;

/**
 * The one place a task's working directory is derived (Phase 84 Theme D).
 *
 * Three call sites used to compute this independently — the terminal spawning
 * the agent's PTY, the quality gate after a Stop hook, and the manual "run
 * checks" trigger — and they disagreed: the gate ran wherever the agent ran,
 * but the manual trigger used `task.repo`'s path alone and ignored the project
 * entirely. A green manual check could therefore describe a tree the agent had
 * never touched. There is now a single resolver; the precedence itself lives in
 * the pure {@link pickSessionCwd} helper so it stays one testable ordering.
 *
 * Deliberately depends on `ProjectsRepository` rather than `ProjectsService`:
 * only the stored `workDir` is needed, and the repository is a leaf on the DB
 * handle, so `TasksModule` can reach it without the `TasksModule ↔
 * ProjectsModule` cycle that injecting the service would create.
 */
@Injectable()
export class CwdResolverService {
  private readonly logger = new Logger(CwdResolverService.name);

  constructor(
    @Inject(ProjectsRepository) private readonly projects: ProjectsRepository,
    @Inject(ReposService) private readonly repos: ReposService,
    @Inject(AgentsService) private readonly agents: AgentsService,
  ) {}

  /**
   * The absolute working directory `task` runs in — repo (when it sits inside
   * the project) → project workDir → profile fallback → gateway cwd, with `~`
   * expanded. An absent task (an ad-hoc terminal with no owning task) resolves
   * to the fallback / gateway cwd, exactly as before.
   */
  resolveForTask(task?: CwdTask): string {
    const projectWorkDir = task?.projectId
      ? (this.projects.getProject(task.projectId)?.workDir ?? undefined)
      : undefined;
    const repoPath = task?.repo ? this.repos.findByName(task.repo)?.path : undefined;

    const choice = pickSessionCwd({
      projectWorkDir,
      repoPath,
      fallback: this.agents.getDefaultWorkDir(),
      gatewayCwd: process.cwd(),
    });

    // Both branches only fire when the task carried a repo *and* a project, i.e.
    // exactly the case whose resolution Phase 84 D changed — so the log is a
    // record of the new behaviour, not noise on every spawn.
    if (choice.source === 'repo' && projectWorkDir) {
      this.logger.log(
        `task ${task?.id}: running in repo ${choice.cwd} (inside project workDir ${projectWorkDir})`,
      );
    } else if (choice.repoOutsideProject) {
      this.logger.warn(
        `task ${task?.id}: repo ${repoPath} resolves outside project workDir ${projectWorkDir} — ` +
          `running in the project directory instead. Register the repo on the project (Phase 84 C) ` +
          `or correct the task's repo.`,
      );
    }

    // expandTilde is a no-op on an already-absolute path, so applying it
    // uniformly to whichever candidate won covers every branch.
    return expandTilde(choice.cwd, homedir());
  }
}
