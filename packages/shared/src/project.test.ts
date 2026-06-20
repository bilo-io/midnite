import { describe, expect, it } from 'vitest';
import {
  CreateProjectRequestSchema,
  MAX_TAG_LENGTH,
  missingProjectRequirements,
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
  sources: [],
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
