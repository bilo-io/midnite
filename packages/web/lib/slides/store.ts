// Client-side deck store, backed by localStorage.
//
// Decks live in the browser under a single JSON key — there is no gateway/server
// database for slides (the whole feature is client-only "for now"). This makes
// decks private per-browser/per-device; clearing site data wipes them.
import { markdownToDeck, slugify, type Slide } from './markdown';
import { SEED_DECKS } from './seed-decks';

const STORAGE_KEY = 'midnite.slides.decks';

// ---- Types ----
export type StoredDeck = {
  id: number;
  slug: string;
  title: string;
  markdown: string;
  content: string; // JSON blob: Slide[] (derived from markdown)
  created_at: string;
  updated_at: string;
};

export type DeckSummary = {
  id: number;
  slug: string;
  title: string;
  count: number;
  created: string;
  updated: string;
};

export type DeckDetail = {
  id: number;
  slug: string;
  title: string;
  markdown: string;
  slides: Slide[];
};

// ---- Storage access ----
// All reads/writes are browser-only. On the server (initial static render)
// these return empty; client components load real data in an effect after mount.
function canUseStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function seed(): StoredDeck[] {
  return SEED_DECKS.map((d, i) => {
    const parsed = markdownToDeck(d.markdown);
    return {
      id: i + 1,
      slug: slugify(d.title),
      title: d.title,
      markdown: d.markdown,
      content: JSON.stringify(parsed.slides),
      created_at: d.created_at,
      updated_at: d.updated_at,
    };
  });
}

function readAll(): StoredDeck[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    // First visit: seed once. Writing (even an empty array) marks the store as
    // initialized so we never re-seed after the user deletes everything.
    const seeded = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as StoredDeck[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(decks: StoredDeck[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

// ---- Helpers ----
function uniqueSlug(base: string, decks: StoredDeck[]): string {
  const taken = new Set(decks.map((d) => d.slug));
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

function nextId(decks: StoredDeck[]): number {
  return decks.reduce((max, d) => Math.max(max, d.id), 0) + 1;
}

// ---- Queries ----
export function getAllDecks(): DeckSummary[] {
  const rows = [...readAll()].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );
  return rows.map((r) => {
    let count = 0;
    try {
      count = (JSON.parse(r.content) as Slide[]).length;
    } catch {
      count = 0;
    }
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      count,
      created: r.created_at,
      updated: r.updated_at,
    };
  });
}

export function getDeckBySlug(slug: string): DeckDetail | null {
  const row = readAll().find((d) => d.slug === slug);
  if (!row) return null;
  let slides: Slide[] = [];
  try {
    slides = JSON.parse(row.content) as Slide[];
  } catch {
    slides = markdownToDeck(row.markdown).slides;
  }
  return { id: row.id, slug: row.slug, title: row.title, markdown: row.markdown, slides };
}

export function createDeck({ markdown, title }: { markdown: string; title?: string }): string {
  const parsed = markdownToDeck(markdown);
  const finalTitle = (title && title.trim()) || parsed.title || 'Untitled';
  const decks = readAll();
  const slug = uniqueSlug(slugify(finalTitle), decks);
  const now = new Date().toISOString();
  decks.push({
    id: nextId(decks),
    slug,
    title: finalTitle,
    markdown,
    content: JSON.stringify(parsed.slides),
    created_at: now,
    updated_at: now,
  });
  writeAll(decks);
  return slug;
}

export function updateDeck(
  slug: string,
  { markdown, title }: { markdown: string; title?: string },
): boolean {
  const decks = readAll();
  const idx = decks.findIndex((d) => d.slug === slug);
  const existing = decks[idx];
  if (idx === -1 || !existing) return false;
  const parsed = markdownToDeck(markdown);
  const finalTitle = (title && title.trim()) || parsed.title || 'Untitled';
  // Keep the slug stable so the deck's URL doesn't change out from under the user.
  decks[idx] = {
    ...existing,
    title: finalTitle,
    markdown,
    content: JSON.stringify(parsed.slides),
    updated_at: new Date().toISOString(),
  };
  writeAll(decks);
  return true;
}

export function deleteDeck(slug: string): void {
  writeAll(readAll().filter((d) => d.slug !== slug));
}

export function duplicateDeck(slug: string): string | null {
  const decks = readAll();
  const src = decks.find((d) => d.slug === slug);
  if (!src) return null;
  const title = `${src.title} (copy)`;
  const newSlug = uniqueSlug(slugify(title), decks);
  const now = new Date().toISOString();
  decks.push({
    ...src,
    id: nextId(decks),
    slug: newSlug,
    title,
    created_at: now,
    updated_at: now,
  });
  writeAll(decks);
  return newSlug;
}
