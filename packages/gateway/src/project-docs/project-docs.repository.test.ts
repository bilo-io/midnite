import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { ProjectDocsRepository } from './project-docs.repository';
import type { ProjectDocInsert } from '../db/schema';

let repo: ProjectDocsRepository;

beforeEach(() => {
  repo = new ProjectDocsRepository(createTestDb().db);
});

function row(id: string, overrides: Partial<ProjectDocInsert> = {}): ProjectDocInsert {
  return {
    id,
    projectId: 'p1',
    templateId: 'prd',
    name: `Doc ${id}`,
    tag: 'PRD',
    color: '#6366f1',
    content: `# Doc ${id}`,
    createdAt: `2026-07-01T00:00:0${id.slice(-1)}.000Z`,
    updatedAt: `2026-07-01T00:00:0${id.slice(-1)}.000Z`,
    ...overrides,
  };
}

describe('ProjectDocsRepository (migration smoke + CRUD)', () => {
  it('migration creates the table so insert + read round-trips', () => {
    repo.create(row('d1', { name: 'Alpha' }));
    const got = repo.get('d1');
    expect(got?.name).toBe('Alpha');
    expect(got?.templateId).toBe('prd');
  });

  it('listByProject is scoped to the project and ordered by createdAt', () => {
    repo.create(row('d1', { createdAt: '2026-07-01T00:00:02.000Z' }));
    repo.create(row('d2', { createdAt: '2026-07-01T00:00:01.000Z' }));
    repo.create(row('d3', { projectId: 'p2' })); // other project → excluded
    const scoped = repo.listByProject('p1');
    expect(scoped.map((r) => r.id)).toEqual(['d2', 'd1']);
  });

  it('update patches and remove deletes', () => {
    repo.create(row('d1'));
    repo.update('d1', { content: 'updated', updatedAt: '2026-07-02T00:00:00.000Z' });
    expect(repo.get('d1')?.content).toBe('updated');
    repo.remove('d1');
    expect(repo.get('d1')).toBeUndefined();
  });

  it('supports a template-less doc (templateId null)', () => {
    repo.create(row('d1', { templateId: null }));
    expect(repo.get('d1')?.templateId).toBeNull();
  });
});
