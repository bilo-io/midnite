import type { ComponentType } from 'react';

import { buildNav, toDocRoute, type DocRoute, type NavGroup } from './nav';

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

export const routes: ResolvedRoute[] = Object.entries(modules).map(([id, module]) => ({
  ...toDocRoute(id, module.frontmatter ?? {}),
  Component: module.default,
}));

export const nav: NavGroup[] = buildNav(routes);
