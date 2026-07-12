import { describe, expect, it } from 'vitest';

import { buildNav, pathFromModuleId, toDocRoute, type DocRoute } from './nav';

describe('pathFromModuleId', () => {
  it('maps a nested content key to a route path', () => {
    expect(pathFromModuleId('./components/button.mdx')).toBe('/components/button');
    expect(pathFromModuleId('./foundations/colors.mdx')).toBe('/foundations/colors');
  });

  it('collapses an index file to its parent (root index → /)', () => {
    expect(pathFromModuleId('./index.mdx')).toBe('/');
    expect(pathFromModuleId('./components/index.mdx')).toBe('/components');
  });

  it('tolerates an absolute-style key with a content/ segment', () => {
    expect(pathFromModuleId('/abs/src/content/components/card.mdx')).toBe('/components/card');
  });
});

describe('toDocRoute', () => {
  it('reads title / section / order from frontmatter', () => {
    expect(toDocRoute('./components/button.mdx', { title: 'Button', section: 'Components', order: 0 })).toEqual({
      path: '/components/button',
      title: 'Button',
      section: 'Components',
      order: 0,
    });
  });

  it('falls back to the path as title and sensible defaults when frontmatter is missing', () => {
    expect(toDocRoute('./components/card.mdx', {})).toEqual({
      path: '/components/card',
      title: '/components/card',
      section: 'Introduction',
      order: 100,
    });
  });
});

describe('buildNav', () => {
  const routes: DocRoute[] = [
    { path: '/components/card', title: 'Card', section: 'Components', order: 1 },
    { path: '/components/button', title: 'Button', section: 'Components', order: 0 },
    { path: '/foundations/colors', title: 'Colours', section: 'Foundations', order: 0 },
    { path: '/', title: 'Overview', section: 'Introduction', order: 0 },
  ];

  it('orders sections by the canonical SECTION_ORDER', () => {
    expect(buildNav(routes).map((group) => group.section)).toEqual(['Introduction', 'Foundations', 'Components']);
  });

  it('orders the product-feature and developer-doc sections after the design-system ones', () => {
    const sections = buildNav([
      { path: '/reference/testing', title: 'Testing plan', section: 'Reference', order: 0 },
      { path: '/architecture', title: 'Architecture', section: 'Architecture', order: 0 },
      { path: '/guides/readme', title: 'README', section: 'Guides', order: 0 },
      { path: '/app/tasks', title: 'Tasks', section: 'App', order: 1 },
      { path: '/agents/memory', title: 'Memory', section: 'Agents', order: 0 },
      { path: '/overview/ops', title: 'Ops', section: 'Overview', order: 2 },
      { path: '/settings/settings', title: 'Settings', section: 'Settings', order: 0 },
      { path: '/', title: 'Overview', section: 'Introduction', order: 0 },
    ]).map((group) => group.section);
    expect(sections).toEqual([
      'Introduction',
      'App',
      'Agents',
      'Overview',
      'Settings',
      'Guides',
      'Architecture',
      'Reference',
    ]);
  });

  it('orders items within a section by `order` then title', () => {
    const components = buildNav(routes).find((group) => group.section === 'Components');
    expect(components?.items.map((item) => item.title)).toEqual(['Button', 'Card']);
  });

  it('puts an unknown section after the known ones', () => {
    const withExtra = buildNav([
      ...routes,
      { path: '/tutorials/x', title: 'X', section: 'Tutorials', order: 0 },
    ]);
    expect(withExtra.at(-1)?.section).toBe('Tutorials');
  });
});
