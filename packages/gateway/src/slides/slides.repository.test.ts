import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../test';
import { SlidesRepository } from './slides.repository';
import type { SlideDeckInsert } from '../db/schema';

let repo: SlidesRepository;

beforeEach(() => {
  repo = new SlidesRepository(createTestDb().db);
});

function row(id: string, overrides: Partial<SlideDeckInsert> = {}): SlideDeckInsert {
  return {
    id,
    name: `Deck ${id}`,
    description: null,
    slideCount: 0,
    format: 'md',
    content: JSON.stringify({ slides: [] }),
    createdAt: `2026-07-01T00:00:0${id.slice(-1)}.000Z`,
    updatedAt: `2026-07-01T00:00:0${id.slice(-1)}.000Z`,
    createdBy: 'u1',
    teamId: 'team-1',
    ...overrides,
  };
}

describe('SlidesRepository (migration smoke + CRUD)', () => {
  it('migration creates the slides table so insert + read round-trips', () => {
    repo.insertDeck(row('d1', { name: 'Intro', slideCount: 2, format: 'mixed' }));
    const got = repo.getDeckRow('d1');
    expect(got?.name).toBe('Intro');
    expect(got?.slideCount).toBe(2);
    expect(got?.format).toBe('mixed');
  });

  it('list is scoped (own + team) and newest-first by updatedAt', () => {
    repo.insertDeck(row('d1', { teamId: 'team-1', createdBy: 'u1' }));
    repo.insertDeck(row('d2', { teamId: 'team-2', createdBy: 'u2' })); // other user + team → hidden
    repo.insertDeck(row('d3', { teamId: 'team-1', createdBy: 'u2' })); // same team → visible
    const scoped = repo.listDeckRows({ userId: 'u1', teamId: 'team-1' });
    expect(scoped.map((r) => r.id)).toEqual(['d3', 'd1']);
  });

  it('getDeckRow hides another user + team deck (miss = undefined)', () => {
    repo.insertDeck(row('d1', { teamId: 'team-2', createdBy: 'u2' }));
    expect(repo.getDeckRow('d1', { userId: 'u1', teamId: 'team-1' })).toBeUndefined();
  });

  it('update patches and delete removes', () => {
    repo.insertDeck(row('d1'));
    repo.updateDeck('d1', { name: 'Renamed', slideCount: 3 });
    expect(repo.getDeckRow('d1')?.name).toBe('Renamed');
    repo.deleteDeck('d1');
    expect(repo.getDeckRow('d1')).toBeUndefined();
  });
});
