import { MarkdownPage } from '../components/markdown-page';
import type { ResolvedRoute } from './registry';

// The project's existing markdown, surfaced as browsable pages. Decision §4:
// **import, don't duplicate** — the real repo files are imported as raw text at
// build time (`?raw`), so editing a source doc updates its page and the docs site
// can never drift from the repo. (The DS docs are authored MDX under content/;
// these product docs are the repo's own .md, rendered via react-markdown — see
// MarkdownPage for why not the MDX pipeline.)
//
// Paths are relative to this file (packages/docs/src/content/): `../../../..` is
// the repo root.
import architecture from '../../../../docs/ARCHITECTURE.md?raw';
import initialPlan from '../../../../docs/INITIAL_PLAN.md?raw';
import memoryWorkspace from '../../../../docs/MEMORY_WORKSPACE.md?raw';
import releasing from '../../../../docs/RELEASING.md?raw';
import testingPlan from '../../../../docs/TESTING_PLAN.md?raw';
import readme from '../../../../README.md?raw';

export type ProductDoc = {
  path: string;
  title: string;
  section: string;
  order: number;
  /** Raw markdown source — rendered by the page, and indexed for search. */
  source: string;
};

// Grouped into product sections that sit after the design-system ones in the
// sidebar (SECTION_ORDER in nav.ts): Guides · Architecture · Reference. Exported
// so the search index (content/search-index.ts) reads the same raw sources.
export const productDocs: ProductDoc[] = [
  { path: '/guides/readme', title: 'README', section: 'Guides', order: 0, source: readme },
  { path: '/guides/initial-plan', title: 'Initial plan', section: 'Guides', order: 1, source: initialPlan },
  { path: '/guides/memory-workspace', title: 'Memory workspace', section: 'Guides', order: 2, source: memoryWorkspace },
  { path: '/architecture', title: 'Architecture', section: 'Architecture', order: 0, source: architecture },
  { path: '/reference/testing', title: 'Testing plan', section: 'Reference', order: 0, source: testingPlan },
  { path: '/reference/releasing', title: 'Releasing', section: 'Reference', order: 1, source: releasing },
];

export const productRoutes: ResolvedRoute[] = productDocs.map(({ source, ...route }) => ({
  ...route,
  Component: () => <MarkdownPage source={source} />,
}));
