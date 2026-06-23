// Pure helpers that turn the MDX content glob into route paths + ordered sidebar
// nav. Kept free of `import.meta.glob` so they unit-test with plain inputs
// (nav.test.ts); registry.ts feeds them the real glob result.

export type DocFrontmatter = {
  title?: string;
  section?: string;
  order?: number;
};

export type DocRoute = {
  /** Route path, e.g. `/components/button` (`/` for the content root). */
  path: string;
  title: string;
  section: string;
  /** Sort key within a section (lower first); defaults high so unset pages trail. */
  order: number;
};

export type NavItem = { path: string; title: string };
export type NavGroup = { section: string; items: NavItem[] };

/** Section display order in the sidebar; unknown sections trail, alphabetically. */
export const SECTION_ORDER = ['Overview', 'Foundations', 'Components'] as const;

const DEFAULT_SECTION = 'Overview';
const DEFAULT_ORDER = 100;

/**
 * Map an `import.meta.glob` key to a route path. The keys are content-dir
 * relative (`./components/button.mdx`); an `index` segment collapses to its
 * parent, so `./index.mdx` → `/`.
 */
export function pathFromModuleId(id: string): string {
  const rel = id
    .replace(/^\.\//, '')
    .replace(/^.*content\//, '')
    .replace(/\.mdx$/, '');
  const segments = rel.split('/').filter((segment) => segment && segment !== 'index');
  return `/${segments.join('/')}`;
}

/** Resolve a glob key + its frontmatter into a {@link DocRoute}. */
export function toDocRoute(id: string, frontmatter: DocFrontmatter): DocRoute {
  const path = pathFromModuleId(id);
  return {
    path,
    title: frontmatter.title?.trim() || path,
    section: frontmatter.section?.trim() || DEFAULT_SECTION,
    order: frontmatter.order ?? DEFAULT_ORDER,
  };
}

function sectionRank(section: string): number {
  const index = (SECTION_ORDER as readonly string[]).indexOf(section);
  return index === -1 ? SECTION_ORDER.length : index;
}

/** Group routes into ordered sidebar sections (section order then per-item order). */
export function buildNav(routes: DocRoute[]): NavGroup[] {
  const bySection = new Map<string, DocRoute[]>();
  for (const route of routes) {
    const list = bySection.get(route.section) ?? [];
    list.push(route);
    bySection.set(route.section, list);
  }

  return [...bySection.entries()]
    .sort(([a], [b]) => sectionRank(a) - sectionRank(b) || a.localeCompare(b))
    .map(([section, list]) => ({
      section,
      items: list
        .slice()
        .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
        .map(({ path, title }) => ({ path, title })),
    }));
}
