import mdx from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import { defineConfig } from 'vite';

// The docs app is a plain Vite + React SPA — a pure consumer of @midnite/ui
// (Phase 26). MDX is the authoring format (Decision §3): prose with inline live
// JSX examples rendered by the real library components.
//
// `providerImportSource` wires every MDX file to the @mdx-js/react MDXProvider so
// our prose-element mapping (src/components/mdx-components.tsx) styles markdown
// with the design-system tokens. `remark-mdx-frontmatter` turns each page's YAML
// frontmatter into an `export const frontmatter` the route registry reads.
export default defineConfig({
  plugins: [
    {
      enforce: 'pre',
      ...mdx({
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [
          remarkGfm,
          remarkFrontmatter,
          [remarkMdxFrontmatter, { name: 'frontmatter' }],
        ],
      }),
    },
    react({ include: /\.(jsx|tsx|mdx?)$/ }),
  ],
});
