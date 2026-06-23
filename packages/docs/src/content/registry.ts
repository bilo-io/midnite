import type { ComponentType } from 'react';

import { buildNav, toDocRoute, type DocRoute, type NavGroup } from './nav';
import { productRoutes } from './product-docs';

type MdxModule = {
  default: ComponentType;
  frontmatter?: { title?: string; section?: string; order?: number };
};

export type ResolvedRoute = DocRoute & { Component: ComponentType };

// Every MDX page under content/ becomes a route + a sidebar entry. Eager so the
// route table is available synchronously at module load (the site is small and
// fully static). Adding a page = adding a file; its frontmatter sets title /
// section / order.
const modules = import.meta.glob<MdxModule>('./**/*.mdx', { eager: true });

const mdxRoutes: ResolvedRoute[] = Object.entries(modules).map(([id, module]) => ({
  ...toDocRoute(id, module.frontmatter ?? {}),
  Component: module.default,
}));

// The DS docs (authored MDX, globbed above) and the product docs (the repo's real
// markdown, imported in product-docs.tsx) share one route table + sidebar nav, so
// the whole site reads as one navigable surface.
export const routes: ResolvedRoute[] = [...mdxRoutes, ...productRoutes];

export const nav: NavGroup[] = buildNav(routes);
