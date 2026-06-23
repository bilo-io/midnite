// Pure, framework-free search over the docs content (page titles + markdown
// headings). Kept out of the React tree and the `import.meta.glob` wiring so it
// unit-tests with plain strings (search.test.ts); search-index.ts feeds it the
// real content globbed from the MDX + repo-markdown sources.

export type IndexedDoc = { path: string; title: string; section: string; body: string };
export type SearchDoc = { path: string; title: string; section: string; headings: string[] };
export type SearchResult = { path: string; title: string; section: string; match: string };

const FRONTMATTER = /^---\n([\s\S]*?)\n---/;
const FENCED_CODE = /```[\s\S]*?```/g;
const ATX_HEADING = /^#{1,6}[ \t]+(.+?)[ \t]*#*$/gm;

/** Read `title` / `section` from a doc's leading YAML frontmatter block (if any). */
export function parseFrontmatter(body: string): { title?: string; section?: string } {
  const block = FRONTMATTER.exec(body);
  if (!block) return {};
  const out: { title?: string; section?: string } = {};
  for (const line of (block[1] ?? '').split('\n')) {
    const field = /^(title|section):\s*(.+?)\s*$/.exec(line);
    const key = field?.[1];
    const value = field?.[2];
    if (key && value !== undefined) out[key as 'title' | 'section'] = value.replace(/^['"]|['"]$/g, '');
  }
  return out;
}

/** ATX markdown headings in document order, with fenced code blocks stripped. */
export function extractHeadings(body: string): string[] {
  const prose = body.replace(FENCED_CODE, '');
  const headings: string[] = [];
  for (const match of prose.matchAll(ATX_HEADING)) {
    const text = match[1]?.trim();
    if (text) headings.push(text);
  }
  return headings;
}

export function buildSearchIndex(docs: IndexedDoc[]): SearchDoc[] {
  return docs.map(({ path, title, section, body }) => ({
    path,
    title,
    section,
    headings: extractHeadings(body),
  }));
}

/**
 * Filter the index by a free-text query (case-insensitive substring). Ranking is
 * title hit ≫ heading hit ≫ section hit, document order within each tier; `match`
 * is the text that matched (for display). Empty query → no results.
 */
export function searchDocs(index: SearchDoc[], query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const titleHits: SearchResult[] = [];
  const headingHits: SearchResult[] = [];
  const sectionHits: SearchResult[] = [];

  for (const doc of index) {
    const base = { path: doc.path, title: doc.title, section: doc.section };
    if (doc.title.toLowerCase().includes(q)) {
      titleHits.push({ ...base, match: doc.title });
      continue;
    }
    const heading = doc.headings.find((h) => h.toLowerCase().includes(q));
    if (heading) {
      headingHits.push({ ...base, match: heading });
      continue;
    }
    if (doc.section.toLowerCase().includes(q)) {
      sectionHits.push({ ...base, match: doc.section });
    }
  }

  return [...titleHits, ...headingHits, ...sectionHits];
}
