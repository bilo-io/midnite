/// <reference types="vite/client" />

// MDX files compile to a React component (default export) plus the named
// `frontmatter` export injected by remark-mdx-frontmatter (vite.config.ts).
declare module '*.mdx' {
  import type { ComponentType } from 'react';

  export const frontmatter: {
    title?: string;
    section?: string;
    order?: number;
  };
  const MDXComponent: ComponentType;
  export default MDXComponent;
}
