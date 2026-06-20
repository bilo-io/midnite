import { describe, expect, it } from 'vitest';
import { BOOKS, bookCategories, bookSearchUrl, filterBooks } from './books';

describe('office library (Phase 9 C)', () => {
  it('lists distinct categories, alphabetised', () => {
    const cats = bookCategories();
    expect(cats).toEqual([...cats].sort((a, b) => a.localeCompare(b)));
    expect(new Set(cats).size).toBe(cats.length);
    expect(cats).toContain('Engineering');
  });

  it('matches title or author, case-insensitively', () => {
    expect(filterBooks(BOOKS, 'clean', 'all').map((b) => b.id)).toContain('clean-code');
    expect(filterBooks(BOOKS, 'FOWLER', 'all').map((b) => b.id)).toContain('refactoring');
  });

  it('returns the whole shelf for an empty query', () => {
    expect(filterBooks(BOOKS, '', 'all')).toHaveLength(BOOKS.length);
    expect(filterBooks(BOOKS, '   ', 'all')).toHaveLength(BOOKS.length);
  });

  it('narrows by category, and combines category + query', () => {
    const eng = filterBooks(BOOKS, '', 'Engineering');
    expect(eng.length).toBeGreaterThan(0);
    expect(eng.every((b) => b.category === 'Engineering')).toBe(true);
    // A title that exists but in another category is excluded by the filter.
    expect(filterBooks(BOOKS, 'neuromancer', 'Engineering')).toHaveLength(0);
    expect(filterBooks(BOOKS, 'neuromancer', 'Sci-Fi').map((b) => b.id)).toEqual(['neuromancer']);
  });

  it('builds an encoded Google search URL', () => {
    const url = bookSearchUrl(BOOKS.find((b) => b.id === 'clean-code')!);
    expect(url.startsWith('https://www.google.com/search?q=')).toBe(true);
    expect(url).toContain(encodeURIComponent('Clean Code Robert C. Martin'));
    expect(url).not.toContain(' ');
  });
});
