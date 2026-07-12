import { describe, expect, it } from 'vitest';

import { buildNav, pathFromModuleId, toDocRoute, type DocRoute } from './nav';

describe('pathFromModuleId', () => {
  it('maps a nested content key to a route path', () => {
    expect(pathFromModuleId('./app/tasks.mdx')).toBe('/app/tasks');
    expect(pathFromModuleId('./agents/memory.mdx')).toBe('/agents/memory');
  });

  it('collapses an index file to its parent (root index → /)', () => {
    expect(pathFromModuleId('./index.mdx')).toBe('/');
    expect(pathFromModuleId('./app/index.mdx')).toBe('/app');
  });

  it('tolerates an absolute-style key with a content/ segment', () => {
    expect(pathFromModuleId('/abs/src/content/agents/media.mdx')).toBe('/agents/media');
  });
});

describe('toDocRoute', () => {
  it('reads title / section / order from frontmatter', () => {
    expect(toDocRoute('./app/tasks.mdx', { title: 'Tasks', section: 'App', order: 1 })).toEqual({
      path: '/app/tasks',
      title: 'Tasks',
      section: 'App',
      order: 1,
    });
  });

  it('falls back to the path as title and sensible defaults when frontmatter is missing', () => {
    expect(toDocRoute('./app/tasks.mdx', {})).toEqual({
      path: '/app/tasks',
      title: '/app/tasks',
      section: 'Introduction',
      order: 100,
    });
  });
});

describe('buildNav', () => {
  const routes: DocRoute[] = [
    { path: '/app/tasks', title: 'Tasks', section: 'App', order: 1 },
    { path: '/app/projects', title: 'Projects', section: 'App', order: 0 },
    { path: '/agents/memory', title: 'Memory', section: 'Agents', order: 0 },
    { path: '/', title: 'Overview', section: 'Introduction', order: 0 },
  ];

  it('orders sections by the canonical SECTION_ORDER', () => {
    expect(buildNav(routes).map((group) => group.section)).toEqual(['Introduction', 'App', 'Agents']);
  });

  it('orders every canonical section in the sidebar sequence', () => {
    const sections = buildNav([
      { path: '/guides/memory-workspace', title: 'Memory workspace', section: 'Guides', order: 0 },
      { path: '/app/tasks', title: 'Tasks', section: 'App', order: 1 },
      { path: '/agents/memory', title: 'Memory', section: 'Agents', order: 0 },
      { path: '/overview/ops', title: 'Ops', section: 'Overview', order: 2 },
      { path: '/settings/settings', title: 'Settings', section: 'Settings', order: 0 },
      { path: '/', title: 'Overview', section: 'Introduction', order: 0 },
    ]).map((group) => group.section);
    expect(sections).toEqual(['Introduction', 'App', 'Agents', 'Overview', 'Settings', 'Guides']);
  });

  it('orders items within a section by `order` then title', () => {
    const app = buildNav(routes).find((group) => group.section === 'App');
    expect(app?.items.map((item) => item.title)).toEqual(['Projects', 'Tasks']);
  });

  it('puts an unknown section after the known ones', () => {
    const withExtra = buildNav([
      ...routes,
      { path: '/tutorials/x', title: 'X', section: 'Tutorials', order: 0 },
    ]);
    expect(withExtra.at(-1)?.section).toBe('Tutorials');
  });
});
