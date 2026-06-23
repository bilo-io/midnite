import mdx from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import rehypeSlug from 'rehype-slug';
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
        // Author DS docs in .mdx only. Plain .md is reserved for the repo's real
        // docs, imported as raw text (content/product-docs.tsx) — so MDX must NOT
        // claim `.md` (its default), or it would try to compile docs/*.md (full of
        // bare `<…>`/`{…}`) as JSX and `?raw` would never reach Vite's raw loader.
        mdExtensions: [],
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [
          remarkGfm,
          remarkFrontmatter,
          [remarkMdxFrontmatter, { name: 'frontmatter' }],
        ],
        // Stable, text-derived ids on every heading so the on-page TOC (and any
        // deep link) can anchor to a section. Same plugin runs on the product-doc
        // (react-markdown) path — see markdown-page.tsx — so both render paths
        // produce identical slugs.
        rehypePlugins: [rehypeSlug],
      }),
    },
    react({ include: /\.(jsx|tsx|mdx?)$/ }),
  ],
});
