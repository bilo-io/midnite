/**
 * Mock data + pure helpers for the office **library** (Phase 9 C). The bookshelf
 * in the library room is an interactable: walking up + pressing E opens a
 * searchable modal of these "books". Clicking one opens a Google search for it.
 *
 * Pure (no Phaser, no React) so the search/filter logic is easy to test/reuse —
 * mirrors the `lib/office/projects.ts` shaping seam.
 */

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  blurb: string;
}

/** A small, hand-picked shelf spanning a few categories. */
export const BOOKS: readonly Book[] = [
  { id: 'pragmatic', title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', category: 'Engineering', blurb: 'From journeyman to master — timeless craft advice.' },
  { id: 'clean-code', title: 'Clean Code', author: 'Robert C. Martin', category: 'Engineering', blurb: 'A handbook of agile software craftsmanship.' },
  { id: 'spja', title: 'Structure and Interpretation of Computer Programs', author: 'Abelson & Sussman', category: 'Engineering', blurb: 'The wizard book — programs as ideas.' },
  { id: 'refactoring', title: 'Refactoring', author: 'Martin Fowler', category: 'Engineering', blurb: 'Improving the design of existing code.' },
  { id: 'dont-make-me-think', title: "Don't Make Me Think", author: 'Steve Krug', category: 'Design', blurb: 'A common-sense approach to web usability.' },
  { id: 'design-everyday', title: 'The Design of Everyday Things', author: 'Don Norman', category: 'Design', blurb: 'Why good design matters, and why most fails.' },
  { id: 'inspired', title: 'Inspired', author: 'Marty Cagan', category: 'Product', blurb: 'How to create tech products customers love.' },
  { id: 'lean-startup', title: 'The Lean Startup', author: 'Eric Ries', category: 'Product', blurb: 'Build–measure–learn, the validated way.' },
  { id: 'high-output', title: 'High Output Management', author: 'Andrew Grove', category: 'Management', blurb: "Intel's legendary playbook for managers." },
  { id: 'managers-path', title: "The Manager's Path", author: 'Camille Fournier', category: 'Management', blurb: 'A guide for tech leaders navigating growth.' },
  { id: 'neuromancer', title: 'Neuromancer', author: 'William Gibson', category: 'Sci-Fi', blurb: 'The novel that defined cyberpunk.' },
  { id: 'three-body', title: 'The Three-Body Problem', author: 'Liu Cixin', category: 'Sci-Fi', blurb: 'First contact, at civilisational scale.' },
];

/** Distinct categories on the shelf, alphabetised — for the filter chips. */
export function bookCategories(books: readonly Book[] = BOOKS): string[] {
  return [...new Set(books.map((b) => b.category))].sort((a, b) => a.localeCompare(b));
}

/**
 * Filter the shelf by a title/author substring (case-insensitive) and an optional
 * category. A `category` of `'all'` (or empty) matches every category; an empty
 * query matches every book.
 */
export function filterBooks(books: readonly Book[], query: string, category: string): Book[] {
  const q = query.trim().toLowerCase();
  return books.filter((b) => {
    if (category && category !== 'all' && b.category !== category) return false;
    if (!q) return true;
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });
}

/** A Google search URL for a book (real reader is a later upgrade). */
export function bookSearchUrl(book: Book): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${book.title} ${book.author}`)}`;
}
