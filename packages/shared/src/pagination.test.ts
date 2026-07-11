import { describe, expect, it } from 'vitest';
import { PageQuerySchema } from './task.js';
import { WorkflowsPageSchema } from './workflow.js';
import { ProjectsPageSchema } from './project.js';
import { ReposPageSchema } from './repo.js';

describe('PageQuerySchema (Phase 57 C follow-up)', () => {
  it('coerces numeric query strings and leaves both optional', () => {
    expect(PageQuerySchema.parse({})).toEqual({});
    expect(PageQuerySchema.parse({ page: '2', limit: '50' })).toEqual({ page: 2, limit: 50 });
  });

  it('rejects a non-positive page and an over-cap limit', () => {
    expect(PageQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(PageQuerySchema.safeParse({ limit: '201' }).success).toBe(false);
  });
});

describe('page schemas are { items, total }', () => {
  it('workflows/projects/repos pages round-trip empty', () => {
    for (const schema of [WorkflowsPageSchema, ProjectsPageSchema, ReposPageSchema]) {
      expect(schema.parse({ items: [], total: 0 })).toEqual({ items: [], total: 0 });
      expect(schema.safeParse({ items: [], total: -1 }).success).toBe(false);
    }
  });
});
