import { ChangelogPage } from '../components/changelog-page';
import { MarkdownPage } from '../components/markdown-page';
import type { ResolvedRoute } from './registry';

// A small set of the repo's own markdown, surfaced as browsable guide pages.
// **Import, don't duplicate** — the real repo file is imported as raw text at
// build time (`?raw`), so editing the source doc updates its page and the docs
// site can never drift from the repo. (Feature docs are authored MDX under
// content/; this is rendered via react-markdown — see MarkdownPage.)
//
// Paths are relative to this file (packages/docs/src/content/): `../../../..` is
// the repo root.
import changelog from '../../../../CHANGELOG.md?raw';
import memoryWorkspace from '../../../../docs/MEMORY_WORKSPACE.md?raw';
import ssoGoLive from '../../../../docs/SSO.md?raw';

/** The changelog is deep-linked from the app's update banner, so it gets a scroll-to-version page. */
const CHANGELOG_PATH = '/changelog';

export type ProductDoc = {
  path: string;
  title: string;
  section: string;
  order: number;
  /** Raw markdown source — rendered by the page, and indexed for search. */
  source: string;
};

// Surfaced under the "Guides" section, which sits after the product-feature
// sections in the sidebar (SECTION_ORDER in nav.ts). Exported so the search
// index (content/search-index.ts) reads the same raw source.
export const productDocs: ProductDoc[] = [
  { path: '/guides/memory-workspace', title: 'Memory workspace', section: 'Guides', order: 0, source: memoryWorkspace },
  { path: '/guides/sso-go-live', title: 'SSO go-live', section: 'Guides', order: 1, source: ssoGoLive },
  { path: CHANGELOG_PATH, title: 'Changelog', section: 'Guides', order: 2, source: changelog },
];

// The changelog needs a scroll-to-version page (it's deep-linked per release from
// the app's update banner); every other product doc is a plain MarkdownPage.
export const productRoutes: ResolvedRoute[] = productDocs.map(({ source, ...route }) => ({
  ...route,
  Component:
    route.path === CHANGELOG_PATH
      ? () => <ChangelogPage source={source} />
      : () => <MarkdownPage source={source} />,
}));
