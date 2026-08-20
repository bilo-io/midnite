import { homedir } from 'node:os';
import { join } from 'node:path';

import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentsService } from '../agents/agents.service';
import type { ProjectsRepository } from '../projects/projects.repository';
import type { ReposService } from '../repos/repos.service';
import { CwdResolverService, type CwdTask } from './cwd-resolver.service';

const HOME = homedir();
const abs = (relative: string) => join(HOME, relative);

/**
 * The Phase 84 D matrix again, but through the *real* lookups — this is what
 * catches a call site that resolves a task's directory some other way.
 */
type Case = {
  name: string;
  task?: CwdTask;
  projectWorkDir?: string;
  repoPath?: string;
  defaultWorkDir?: string;
  expected: string;
};

const task = (over: Partial<CwdTask> = {}): CwdTask => ({
  id: 't1',
  projectId: undefined,
  repo: undefined,
  ...over,
});

const CASES: Case[] = [
  {
    name: 'project + repo inside it → the repo directory',
    task: task({ projectId: 'p1', repo: 'gateway' }),
    projectWorkDir: '~/Dev/midnite',
    repoPath: '~/Dev/midnite/packages/gateway',
    expected: abs('Dev/midnite/packages/gateway'),
  },
  {
    name: 'project + repo outside it → the project directory',
    task: task({ projectId: 'p1', repo: 'elsewhere' }),
    projectWorkDir: '~/Dev/midnite',
    repoPath: '~/Dev/unrelated',
    expected: abs('Dev/midnite'),
  },
  {
    name: 'project only → the project directory',
    task: task({ projectId: 'p1' }),
    projectWorkDir: '~/Dev/midnite',
    expected: abs('Dev/midnite'),
  },
  {
    name: 'repo only → the repo directory',
    task: task({ repo: 'gateway' }),
    repoPath: '~/Dev/gateway',
    expected: abs('Dev/gateway'),
  },
  {
    name: 'neither → the profile default work directory',
    task: task(),
    defaultWorkDir: '~/scratch',
    expected: abs('scratch'),
  },
  {
    name: 'no task at all (ad-hoc terminal) → the profile default',
    task: undefined,
    defaultWorkDir: '~/scratch',
    expected: abs('scratch'),
  },
  {
    name: 'nothing configured → the gateway cwd',
    task: task(),
    expected: process.cwd(),
  },
  {
    name: 'a repo name the registry does not know falls through to the project',
    task: task({ projectId: 'p1', repo: 'ghost' }),
    projectWorkDir: '~/Dev/midnite',
    expected: abs('Dev/midnite'),
  },
];

function build(c: Pick<Case, 'projectWorkDir' | 'repoPath' | 'defaultWorkDir'>) {
  const projects = {
    getProject: vi.fn(() => (c.projectWorkDir ? { workDir: c.projectWorkDir } : undefined)),
  } as unknown as ProjectsRepository;
  const repos = {
    findByName: vi.fn(() => (c.repoPath ? { path: c.repoPath } : undefined)),
  } as unknown as ReposService;
  const agents = {
    getDefaultWorkDir: vi.fn(() => c.defaultWorkDir),
  } as unknown as AgentsService;
  return new CwdResolverService(projects, repos, agents);
}

describe('CwdResolverService', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(CASES)('$name', (c) => {
    expect(build(c).resolveForTask(c.task)).toBe(c.expected);
  });

  it('never consults the repo registry for a task with no repo', () => {
    const repos = { findByName: vi.fn() } as unknown as ReposService;
    const service = new CwdResolverService(
      { getProject: vi.fn(() => undefined) } as unknown as ProjectsRepository,
      repos,
      { getDefaultWorkDir: vi.fn(() => undefined) } as unknown as AgentsService,
    );
    service.resolveForTask(task());
    expect(repos.findByName).not.toHaveBeenCalled();
  });

  it('logs when the repo supersedes the project directory', () => {
    build({ projectWorkDir: '~/Dev/midnite', repoPath: '~/Dev/midnite/packages/web' }).resolveForTask(
      task({ projectId: 'p1', repo: 'web' }),
    );
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('inside project workDir'),
    );
    expect(Logger.prototype.warn).not.toHaveBeenCalled();
  });

  it('warns — naming both paths — when the repo resolves outside the project', () => {
    build({ projectWorkDir: '~/Dev/midnite', repoPath: '~/Dev/unrelated' }).resolveForTask(
      task({ projectId: 'p1', repo: 'unrelated' }),
    );
    const [message] = vi.mocked(Logger.prototype.warn).mock.calls[0] as [string];
    expect(message).toContain('~/Dev/unrelated');
    expect(message).toContain('~/Dev/midnite');
  });

  it('stays quiet when there is no project to disagree with', () => {
    build({ repoPath: '~/Dev/gateway' }).resolveForTask(task({ repo: 'gateway' }));
    expect(Logger.prototype.log).not.toHaveBeenCalled();
    expect(Logger.prototype.warn).not.toHaveBeenCalled();
  });
});
