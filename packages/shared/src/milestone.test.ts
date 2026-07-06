import { describe, expect, it } from 'vitest';
import {
  CreateMilestoneRequestSchema,
  MilestoneSchema,
  ReorderMilestonesRequestSchema,
  RoadmapViewSchema,
  UpdateMilestoneRequestSchema,
} from './milestone.js';

const base = {
  id: 'm1',
  projectId: 'p1',
  name: 'Alpha',
  position: 0,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

describe('MilestoneSchema', () => {
  it('parses a valid milestone', () => {
    const m = MilestoneSchema.parse({ ...base, description: 'd', targetDate: '2026-08-01', teamId: 't1' });
    expect(m.name).toBe('Alpha');
    expect(m.targetDate).toBe('2026-08-01');
  });

  it('rejects an empty name and an over-long one', () => {
    expect(MilestoneSchema.safeParse({ ...base, name: '' }).success).toBe(false);
    expect(MilestoneSchema.safeParse({ ...base, name: 'x'.repeat(121) }).success).toBe(false);
  });

  it('requires a non-negative integer position', () => {
    expect(MilestoneSchema.safeParse({ ...base, position: -1 }).success).toBe(false);
    expect(MilestoneSchema.safeParse({ ...base, position: 1.5 }).success).toBe(false);
  });
});

describe('CreateMilestoneRequestSchema', () => {
  it('trims and requires a name', () => {
    expect(CreateMilestoneRequestSchema.parse({ name: '  M  ' }).name).toBe('M');
    expect(CreateMilestoneRequestSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});

describe('UpdateMilestoneRequestSchema', () => {
  it('accepts a null targetDate (clear) but not a null name', () => {
    expect(UpdateMilestoneRequestSchema.parse({ targetDate: null }).targetDate).toBeNull();
    expect(UpdateMilestoneRequestSchema.safeParse({ name: null }).success).toBe(false);
  });
});

describe('ReorderMilestonesRequestSchema', () => {
  it('requires at least one id', () => {
    expect(ReorderMilestonesRequestSchema.parse({ milestoneIds: ['a'] }).milestoneIds).toEqual(['a']);
    expect(ReorderMilestonesRequestSchema.safeParse({ milestoneIds: [] }).success).toBe(false);
  });
});

describe('RoadmapViewSchema', () => {
  it('parses milestones with computed progress + a backlog', () => {
    const view = RoadmapViewSchema.parse({
      projectId: 'p1',
      milestones: [{ ...base, done: 1, total: 2, tasks: [] }],
      backlog: [],
    });
    expect(view.milestones[0]?.done).toBe(1);
    expect(view.milestones[0]?.total).toBe(2);
  });
});
