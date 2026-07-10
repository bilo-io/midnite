import { describe, expect, it } from 'vitest';
import {
  CreateProjectRequestSchema,
  MAX_TAG_LENGTH,
  missingProjectRequirements,
  projectCompletion,
  ProjectSchema,
  type Project,
} from './project.js';

const baseProject: Project = {
  id: 'p1',
  name: 'Midnite',
  tag: 'mid',
  color: '#7c3aed',
  workDir: '~/Dev/midnite',
  createdAt: '2026-06-20T00:00:00.000Z',
  updatedAt: '2026-06-20T00:00:00.000Z',
};

describe('ProjectSchema', () => {
  it('round-trips a complete project', () => {
    expect(ProjectSchema.parse(baseProject)).toEqual(baseProject);
  });

  it('rejects a non-hex color', () => {
    expect(ProjectSchema.safeParse({ ...baseProject, color: 'purple' }).success).toBe(false);
  });

  it('rejects a tag over the max length', () => {
    expect(
      ProjectSchema.safeParse({ ...baseProject, tag: 'x'.repeat(MAX_TAG_LENGTH + 1) }).success,
    ).toBe(false);
  });
});

describe('CreateProjectRequestSchema', () => {
  it('rejects a blank name', () => {
    expect(
      CreateProjectRequestSchema.safeParse({ name: '  ', tag: 'm', color: '#7c3aed' }).success,
    ).toBe(false);
  });
});

describe('projectCompletion', () => {
  it('computes done/total/pct from the status breakdown', () => {
    const p: Project = { ...baseProject, taskStatusCounts: { todo: 2, wip: 1, done: 3 }, taskCount: 6 };
    expect(projectCompletion(p)).toEqual({ done: 3, total: 6, pct: 50 });
  });

  it('counts abandoned tasks in the denominator', () => {
    const p: Project = { ...baseProject, taskStatusCounts: { done: 2, abandoned: 1, todo: 1 } };
    // 2 done of 4 total (abandoned included) → 50%, not 2/3.
    expect(projectCompletion(p)).toEqual({ done: 2, total: 4, pct: 50 });
  });

  it('is 0% for a project with no tasks', () => {
    expect(projectCompletion({ ...baseProject, taskStatusCounts: {} })).toEqual({
      done: 0,
      total: 0,
      pct: 0,
    });
  });

  it('is 100% when every task is done', () => {
    expect(projectCompletion({ ...baseProject, taskStatusCounts: { done: 4 } })).toEqual({
      done: 4,
      total: 4,
      pct: 100,
    });
  });

  it('falls back to taskCount (done unknown) when the breakdown is absent', () => {
    expect(projectCompletion({ ...baseProject, taskCount: 5 })).toEqual({ done: 0, total: 5, pct: 0 });
  });

  it('rounds the percentage', () => {
    // 1 of 3 → 33.33 → 33
    expect(projectCompletion({ ...baseProject, taskStatusCounts: { done: 1, todo: 2 } }).pct).toBe(33);
  });
});

describe('missingProjectRequirements', () => {
  it('returns no requirements for a complete project', () => {
    expect(missingProjectRequirements(baseProject)).toEqual([]);
  });

  it('flags a folder-less project as incomplete', () => {
    expect(missingProjectRequirements({ ...baseProject, workDir: undefined })).toEqual(['folder']);
  });

  it('flags name and folder when both are blank', () => {
    const empty = { ...baseProject, name: '   ', workDir: '' };
    expect(missingProjectRequirements(empty)).toEqual(['name', 'folder']);
  });
});
