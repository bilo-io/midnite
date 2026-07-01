import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SlidesService } from './slides.service';
import type { SlideDeckInsert, SlideDeckRow } from '../db/schema';

// In-memory fake repo mirroring SlidesRepository's surface.
function makeRepo() {
  const rows = new Map<string, SlideDeckRow>();
  return {
    rows,
    insertDeck: vi.fn((row: SlideDeckInsert) => {
      const full = { ...row, description: row.description ?? null } as SlideDeckRow;
      rows.set(row.id, full);
      return full;
    }),
    getDeckRow: vi.fn((id: string) => rows.get(id)),
    listDeckRows: vi.fn(() => [...rows.values()]),
    updateDeck: vi.fn((id: string, patch: Partial<SlideDeckInsert>) => {
      const cur = rows.get(id);
      if (!cur) return undefined;
      const next = { ...cur, ...patch } as SlideDeckRow;
      rows.set(id, next);
      return next;
    }),
    deleteDeck: vi.fn((id: string) => void rows.delete(id)),
  };
}

const search = { upsert: vi.fn(), remove: vi.fn() };
const audit = { record: vi.fn() };

let repo: ReturnType<typeof makeRepo>;
let svc: SlidesService;

beforeEach(() => {
  vi.clearAllMocks();
  repo = makeRepo();
  svc = new SlidesService(repo as never, search as never, audit as never);
});

describe('SlidesService.create', () => {
  it('creates an empty deck (slideCount 0, format md) when no content given', () => {
    const deck = svc.create({ name: 'Empty' });
    expect(deck.slideCount).toBe(0);
    expect(deck.format).toBe('md');
    expect(deck.content.slides).toEqual([]);
    expect(search.upsert).toHaveBeenCalledOnce();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'deck', action: 'deck.created' }),
    );
  });

  it('derives slideCount + a mixed format badge from seed content', () => {
    const deck = svc.create({
      name: 'D',
      content: {
        slides: [
          { id: 's1', format: 'md', content: '# a' },
          { id: 's2', format: 'html', content: '<h1/>' },
        ],
      },
    });
    expect(deck.slideCount).toBe(2);
    expect(deck.format).toBe('mixed');
  });

  it('stamps createdBy + teamId from the scope', () => {
    const deck = svc.create({ name: 'D' }, { userId: 'u1', teamId: 'team-1' });
    expect(deck.createdBy).toBe('u1');
    expect(deck.teamId).toBe('team-1');
  });
});

describe('SlidesService.getDeck', () => {
  it('404s an unknown id', () => {
    expect(() => svc.getDeck('nope')).toThrow(/not found/);
  });

  it('round-trips a stored deck', () => {
    const created = svc.create({ name: 'D', content: { slides: [{ id: 's1', format: 'html', content: '<p/>' }] } });
    const got = svc.getDeck(created.id);
    expect(got.format).toBe('html');
    expect(got.content.slides).toHaveLength(1);
  });
});

describe('SlidesService.update', () => {
  it('re-derives slideCount/format on a content change and re-indexes', () => {
    const created = svc.create({ name: 'D' });
    const updated = svc.update(created.id, {
      content: { slides: [{ id: 's1', format: 'md', content: 'a' }, { id: 's2', format: 'md', content: 'b' }] },
    });
    expect(updated.slideCount).toBe(2);
    expect(updated.format).toBe('md');
    expect(search.upsert).toHaveBeenCalledTimes(2); // create + update
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'deck.updated' }),
    );
  });

  it('keeps existing content when only the name changes', () => {
    const created = svc.create({ name: 'D', content: { slides: [{ id: 's1', format: 'md', content: 'a' }] } });
    const updated = svc.update(created.id, { name: 'Renamed' });
    expect(updated.name).toBe('Renamed');
    expect(updated.slideCount).toBe(1);
  });

  it('404s an unknown id', () => {
    expect(() => svc.update('nope', { name: 'x' })).toThrow(/not found/);
  });
});

describe('SlidesService.delete', () => {
  it('removes the deck + its search row', () => {
    const created = svc.create({ name: 'D' });
    svc.delete(created.id);
    expect(() => svc.getDeck(created.id)).toThrow(/not found/);
    expect(search.remove).toHaveBeenCalledWith('deck', created.id);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'deck.deleted' }));
  });
});

describe('SlidesService.listSummaries', () => {
  it('projects rows to summaries without the content body', () => {
    svc.create({ name: 'A' });
    svc.create({ name: 'B' });
    const summaries = svc.listSummaries();
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).not.toHaveProperty('content');
    expect(summaries[0]).toHaveProperty('slideCount');
  });
});
