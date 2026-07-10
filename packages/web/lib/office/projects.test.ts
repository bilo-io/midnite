import { describe, expect, it } from 'vitest';
import type { Project } from '@midnite/shared';
import { boardroomProjects } from './projects';

const project = (over: Partial<Project> & Pick<Project, 'id' | 'name' | 'tag' | 'color'>): Project => ({
  description: undefined,
  workDir: undefined,
  plan: undefined,
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('boardroomProjects', () => {
  it('drops archived projects and sorts by name', () => {
    const projects = [
      project({ id: 'b', name: 'Beta', tag: 'BETA', color: '#111111' }),
      project({ id: 'a', name: 'Alpha', tag: 'ALPHA', color: '#222222' }),
      project({ id: 'z', name: 'Zeta', tag: 'ZETA', color: '#333333', archived: true }),
    ];
    expect(boardroomProjects(projects).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('returns an empty list when there are no active projects', () => {
    const projects = [project({ id: 'z', name: 'Zeta', tag: 'ZETA', color: '#333333', archived: true })];
    expect(boardroomProjects(projects)).toEqual([]);
  });
});
