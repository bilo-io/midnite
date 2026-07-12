import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDeck,
  deleteDeck,
  duplicateDeck,
  getAllDecks,
  getDeckBySlug,
  updateDeck,
} from './store';

const KEY = 'midnite.slides.decks';

beforeEach(() => {
  window.localStorage.clear();
});

describe('slides store', () => {
  it('seeds a starter deck on first read', () => {
    expect(getAllDecks().length).toBeGreaterThan(0);
  });

  it('creates a deck and reads it back by slug', () => {
    const slug = createDeck({ markdown: '# My Talk\n\n## Intro\n\n- hi' });
    const detail = getDeckBySlug(slug);
    expect(detail?.title).toBe('My Talk');
    expect(detail?.slides.length).toBe(2); // cover + Intro
  });

  it('derives the slide count in the summary', () => {
    const slug = createDeck({ markdown: '# A\n\n## B\n\n- x\n\n## C\n\n- y' });
    const summary = getAllDecks().find((d) => d.slug === slug);
    expect(summary?.count).toBe(3);
  });

  it('keeps the slug stable across an update', () => {
    const slug = createDeck({ markdown: '# Keep', title: 'Keep' });
    const ok = updateDeck(slug, { markdown: '# Keep\n\n## New\n\n- x', title: 'Keep' });
    expect(ok).toBe(true);
    expect(getDeckBySlug(slug)?.slides.length).toBe(2);
  });

  it('gives each deck a unique slug', () => {
    const a = createDeck({ markdown: '# Dup', title: 'Dup' });
    const b = createDeck({ markdown: '# Dup', title: 'Dup' });
    expect(a).not.toBe(b);
  });

  it('duplicates a deck as "(copy)" with a fresh slug', () => {
    const slug = createDeck({ markdown: '# Orig', title: 'Orig' });
    const copy = duplicateDeck(slug);
    expect(copy).toBeTruthy();
    expect(getDeckBySlug(copy!)?.title).toBe('Orig (copy)');
  });

  it('deletes a deck', () => {
    const slug = createDeck({ markdown: '# Bye', title: 'Bye' });
    deleteDeck(slug);
    expect(getDeckBySlug(slug)).toBeNull();
  });

  it('stores and reads back an assigned projectId', () => {
    const slug = createDeck({ markdown: '# P', title: 'P', projectId: 'proj-1' });
    expect(getDeckBySlug(slug)?.projectId).toBe('proj-1');
    expect(getAllDecks().find((d) => d.slug === slug)?.projectId).toBe('proj-1');
  });

  it('defaults projectId to null when unassigned', () => {
    const slug = createDeck({ markdown: '# NP', title: 'NP' });
    expect(getDeckBySlug(slug)?.projectId).toBeNull();
  });

  it('updates a deck project without touching it when projectId is omitted', () => {
    const slug = createDeck({ markdown: '# U', title: 'U', projectId: 'proj-a' });
    // Omitting projectId keeps the existing assignment.
    updateDeck(slug, { markdown: '# U\n\n## S\n\n- x', title: 'U' });
    expect(getDeckBySlug(slug)?.projectId).toBe('proj-a');
    // Passing null clears it.
    updateDeck(slug, { markdown: '# U', title: 'U', projectId: null });
    expect(getDeckBySlug(slug)?.projectId).toBeNull();
  });

  it('never re-seeds after everything is deleted', () => {
    // Trigger the initial seed, then delete every deck.
    for (const d of getAllDecks()) deleteDeck(d.slug);
    expect(getAllDecks()).toHaveLength(0);
    // The store must stay empty (the key is present), not re-seed.
    expect(window.localStorage.getItem(KEY)).toBe('[]');
    expect(getAllDecks()).toHaveLength(0);
  });
});
