import { describe, expect, it } from 'vitest';
import type { Memory, Project } from '@midnite/shared';
import { boardroomDocs, boardroomProjects } from './documents';

const project = (over: Partial<Project> & Pick<Project, 'id' | 'name' | 'tag' | 'color'>): Project => ({
  description: undefined,
  workDir: undefined,
  plan: undefined,
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  sources: [],
  ...over,
});

const memory = (over: Partial<Memory> & Pick<Memory, 'id' | 'title' | 'content' | 'projectId'>): Memory => ({
  sources: [],
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
});

describe('boardroomDocs', () => {
  const projects = [
    project({ id: 'p1', name: 'Alpha', tag: 'ALPHA', color: '#111111', plan: '# Plan A' }),
    project({ id: 'p2', name: 'Beta', tag: 'BETA', color: '#222222' }), // no plan
  ];
  const memories = [
    memory({ id: 'm1', title: 'Note A', content: 'a', projectId: 'p1' }),
    memory({ id: 'm2', title: 'Global', content: 'g', projectId: null }),
    memory({ id: 'm3', title: 'Archived', content: 'x', projectId: 'p1', archived: true }),
    memory({ id: 'm4', title: 'Note B', content: 'b', projectId: 'p2' }),
  ];

  it('lists a project plan first, then its non-archived scoped memories', () => {
    const docs = boardroomDocs(projects, memories, 'p1');
    expect(docs.map((d) => ({ id: d.id, kind: d.kind }))).toEqual([
      { id: 'plan-p1', kind: 'plan' },
      { id: 'm1', kind: 'memory' },
    ]);
    expect(docs[0]!.tag).toBe('ALPHA');
  });

  it('omits the plan when a project has none', () => {
    const docs = boardroomDocs(projects, memories, 'p2');
    expect(docs.map((d) => d.id)).toEqual(['m4']);
  });

  it('aggregates across all projects (global memories excluded)', () => {
    const docs = boardroomDocs(projects, memories, 'all');
    expect(docs.map((d) => d.id)).toEqual(['plan-p1', 'm1', 'm4']);
  });
});
