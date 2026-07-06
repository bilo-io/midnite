import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { MilestonesRepository } from './milestones.repository';
import type { RoadmapMilestoneInsert } from '../db/schema';

let repo: MilestonesRepository;

beforeEach(() => {
  repo = new MilestonesRepository(createTestDb().db);
});

function row(id: string, overrides: Partial<RoadmapMilestoneInsert> = {}): RoadmapMilestoneInsert {
  return {
    id,
    projectId: 'p1',
    name: `Milestone ${id}`,
    description: null,
    position: 0,
    targetDate: null,
    createdAt: `2026-07-01T00:00:0${id.slice(-1)}.000Z`,
    updatedAt: `2026-07-01T00:00:0${id.slice(-1)}.000Z`,
    createdBy: 'u1',
    teamId: 'team-1',
    ...overrides,
  };
}

describe('MilestonesRepository (migration smoke + CRUD)', () => {
  it('migration creates the table so insert + read round-trips', () => {
    repo.insert(row('m1', { name: 'Alpha', position: 2, targetDate: '2026-08-01' }));
    const got = repo.getById('m1');
    expect(got?.name).toBe('Alpha');
    expect(got?.position).toBe(2);
    expect(got?.targetDate).toBe('2026-08-01');
  });

  it('listByProject is scoped (own + team) and ordered by position', () => {
    repo.insert(row('m1', { position: 1, teamId: 'team-1', createdBy: 'u1' }));
    repo.insert(row('m2', { position: 0, teamId: 'team-1', createdBy: 'u1' }));
    repo.insert(row('m3', { position: 0, projectId: 'p2' })); // other project → excluded
    repo.insert(row('m4', { teamId: 'team-2', createdBy: 'u2' })); // other user+team → hidden
    const scoped = repo.listByProject('p1', { userId: 'u1', teamId: 'team-1' });
    expect(scoped.map((r) => r.id)).toEqual(['m2', 'm1']);
  });

  it('nextPosition returns max+1 per project (0 when empty)', () => {
    expect(repo.nextPosition('p1')).toBe(0);
    repo.insert(row('m1', { position: 0 }));
    repo.insert(row('m2', { position: 3 }));
    expect(repo.nextPosition('p1')).toBe(4);
    expect(repo.nextPosition('p2')).toBe(0);
  });

  it('reorder reassigns positions scoped to the project', () => {
    repo.insert(row('m1', { position: 0 }));
    repo.insert(row('m2', { position: 1 }));
    repo.insert(row('m3', { position: 2 }));
    repo.reorder('p1', ['m3', 'm1', 'm2'], '2026-07-02T00:00:00.000Z');
    expect(repo.listByProject('p1').map((r) => r.id)).toEqual(['m3', 'm1', 'm2']);
  });

  it('update patches and delete removes', () => {
    repo.insert(row('m1'));
    repo.update('m1', { name: 'Renamed', position: 5 });
    expect(repo.getById('m1')?.name).toBe('Renamed');
    repo.delete('m1');
    expect(repo.getById('m1')).toBeUndefined();
  });
});
