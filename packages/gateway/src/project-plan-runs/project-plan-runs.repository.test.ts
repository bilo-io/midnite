import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { ProjectPlanRunsRepository } from './project-plan-runs.repository';
import type { ProjectPlanRunInsert } from '../db/schema';

let repo: ProjectPlanRunsRepository;

beforeEach(() => {
  repo = new ProjectPlanRunsRepository(createTestDb().db);
});

function row(id: string, overrides: Partial<ProjectPlanRunInsert> = {}): ProjectPlanRunInsert {
  return {
    id,
    projectId: 'p1',
    status: 'running',
    terminalId: `project-plan-${id}`,
    output: null,
    error: null,
    startedAt: `2026-07-01T00:00:0${id.slice(-1)}.000Z`,
    finishedAt: null,
    ...overrides,
  };
}

describe('ProjectPlanRunsRepository (migration smoke + CRUD)', () => {
  it('migration creates the table so insert + read round-trips', () => {
    repo.create(row('r1'));
    const got = repo.get('r1');
    expect(got?.projectId).toBe('p1');
    expect(got?.status).toBe('running');
    expect(got?.terminalId).toBe('project-plan-r1');
  });

  it('returns undefined for an unknown run', () => {
    expect(repo.get('nope')).toBeUndefined();
  });

  it('update patches status/output/error/finishedAt', () => {
    repo.create(row('r1'));
    const updated = repo.update('r1', {
      status: 'done',
      output: '# Overview',
      finishedAt: '2026-07-01T00:05:00.000Z',
    });
    expect(updated?.status).toBe('done');
    expect(updated?.output).toBe('# Overview');
    expect(updated?.finishedAt).toBe('2026-07-01T00:05:00.000Z');
    expect(repo.get('r1')?.status).toBe('done');
  });

  it('listByProject is scoped to the project, newest first', () => {
    repo.create(row('r1', { startedAt: '2026-07-01T00:00:01.000Z' }));
    repo.create(row('r2', { startedAt: '2026-07-01T00:00:02.000Z' }));
    repo.create(row('r3', { projectId: 'p2' })); // other project → excluded
    const scoped = repo.listByProject('p1');
    expect(scoped.map((r) => r.id)).toEqual(['r2', 'r1']);
  });

  it('listStaleRuns returns only rows still marked running', () => {
    repo.create(row('r1', { status: 'running' }));
    repo.create(row('r2', { status: 'done', finishedAt: '2026-07-01T00:00:02.000Z' }));
    repo.create(row('r3', { status: 'error', error: 'boom' }));
    expect(repo.listStaleRuns().map((r) => r.id)).toEqual(['r1']);
  });
});
