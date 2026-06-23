import { productDocs } from './product-docs';
import { routes } from './registry';
import { buildSearchIndex, type IndexedDoc, type SearchDoc } from './search';

// The live search index, built once at module load (the site is small + fully
// static). Two content sources:
//
// - Product docs — the repo's real markdown, whose raw sources product-docs.tsx
//   exports; indexed with full heading extraction (they're long, so headings add
//   real value).
// - DS docs — the .mdx pages. Their *compiled* form is the only handle we have
//   (the MDX rollup plugin strips the `?raw` query, so we can't read their text
//   without compiling), so we index them by title + section from the route table.
//   These pages are short single-primitive docs, so the title/section suffice.
//
// Importing `routes` keeps the compiled MDX in the graph — fine in the app (the
// MDX plugin is present); tests that reach DocSearch mock this module so the
// MDX-less vitest runner never has to transform a .mdx file.
const productPaths = new Set(productDocs.map((doc) => doc.path));

const productIndexDocs: IndexedDoc[] = productDocs.map((doc) => ({
  path: doc.path,
  title: doc.title,
  section: doc.section,
  body: doc.source,
}));

const dsIndexDocs: IndexedDoc[] = routes
  .filter((route) => !productPaths.has(route.path))
  .map((route) => ({ path: route.path, title: route.title, section: route.section, body: '' }));

export const searchIndex: SearchDoc[] = buildSearchIndex([...dsIndexDocs, ...productIndexDocs]);
