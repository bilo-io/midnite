import { describe, expect, it } from 'vitest';
import {
  CreateRepoRequestSchema,
  MAX_REPO_BRANCH_PREFIX_LENGTH,
  MAX_REPO_NAME_LENGTH,
  MAX_REPO_PATH_LENGTH,
  MAX_REPO_PR_TEMPLATE_LENGTH,
  RepoSchema,
  UpdateRepoRequestSchema,
} from './repo.js';

describe('RepoSchema', () => {
  it('accepts a complete repo', () => {
    const repo = {
      id: '01',
      name: 'midnite',
      path: '~/Dev/midnite',
      createdAt: '2026-06-21T00:00:00.000Z',
      updatedAt: '2026-06-21T00:00:00.000Z',
    };
    expect(RepoSchema.parse(repo)).toEqual(repo);
  });

  it('accepts optional branchPrefix and prTemplate', () => {
    const repo = {
      id: '01',
      name: 'midnite',
      path: '~/Dev/midnite',
      branchPrefix: 'feature/',
      prTemplate: '## Summary\n\n## Testing',
      createdAt: '2026-06-21T00:00:00.000Z',
      updatedAt: '2026-06-21T00:00:00.000Z',
    };
    expect(RepoSchema.parse(repo)).toEqual(repo);
  });
});

describe('CreateRepoRequestSchema', () => {
  it('trims name and path', () => {
    const parsed = CreateRepoRequestSchema.parse({ name: '  api  ', path: '  ~/Dev/api  ' });
    expect(parsed).toEqual({ name: 'api', path: '~/Dev/api' });
  });

  it('rejects an empty name', () => {
    expect(CreateRepoRequestSchema.safeParse({ name: '   ', path: '~/x' }).success).toBe(false);
  });

  it('rejects an empty path', () => {
    expect(CreateRepoRequestSchema.safeParse({ name: 'api', path: '   ' }).success).toBe(false);
  });

  it('rejects an over-long name', () => {
    const name = 'a'.repeat(MAX_REPO_NAME_LENGTH + 1);
    expect(CreateRepoRequestSchema.safeParse({ name, path: '~/x' }).success).toBe(false);
  });

  it('rejects an over-long path', () => {
    const path = '/'.repeat(MAX_REPO_PATH_LENGTH + 1);
    expect(CreateRepoRequestSchema.safeParse({ name: 'api', path }).success).toBe(false);
  });

  it('trims and accepts optional conventions', () => {
    const parsed = CreateRepoRequestSchema.parse({
      name: 'api',
      path: '~/x',
      branchPrefix: '  feature/  ',
      prTemplate: '  ## Why  ',
    });
    expect(parsed).toEqual({
      name: 'api',
      path: '~/x',
      branchPrefix: 'feature/',
      prTemplate: '## Why',
    });
  });

  it('rejects an over-long branch prefix', () => {
    const branchPrefix = 'a'.repeat(MAX_REPO_BRANCH_PREFIX_LENGTH + 1);
    expect(CreateRepoRequestSchema.safeParse({ name: 'api', path: '~/x', branchPrefix }).success).toBe(
      false,
    );
  });

  it('rejects an over-long PR template', () => {
    const prTemplate = 'a'.repeat(MAX_REPO_PR_TEMPLATE_LENGTH + 1);
    expect(CreateRepoRequestSchema.safeParse({ name: 'api', path: '~/x', prTemplate }).success).toBe(
      false,
    );
  });
});

describe('UpdateRepoRequestSchema', () => {
  it('accepts a name-only patch', () => {
    expect(UpdateRepoRequestSchema.parse({ name: 'renamed' })).toEqual({ name: 'renamed' });
  });

  it('accepts a path-only patch', () => {
    expect(UpdateRepoRequestSchema.parse({ path: '~/elsewhere' })).toEqual({ path: '~/elsewhere' });
  });

  it('accepts a branchPrefix-only patch', () => {
    expect(UpdateRepoRequestSchema.parse({ branchPrefix: 'fix/' })).toEqual({ branchPrefix: 'fix/' });
  });

  it('accepts clearing a convention with an empty string', () => {
    expect(UpdateRepoRequestSchema.parse({ prTemplate: '' })).toEqual({ prTemplate: '' });
  });

  it('rejects an empty patch', () => {
    expect(UpdateRepoRequestSchema.safeParse({}).success).toBe(false);
  });
});
