import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));
const r = (p: string) => resolve(here, p);

// Externalize every declared dependency + peer dependency (and their subpaths,
// e.g. `react/jsx-runtime`) so the bundle ships only this package's own code and
// consumers dedupe the shared runtime deps — the canonical library build.
const pkg = JSON.parse(readFileSync(r('package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};
const external = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
].map((name) => new RegExp(`^${name}(?:/.*)?$`));

// The design tokens + the highlight.js token palette are plain CSS — there is
// nothing to bundle, so ship them verbatim at dist/*.css (exposed as
// `@midnite/ui/styles` and `@midnite/ui/code-highlight.css`). Vite's lib build
// only emits the JS entries; this copies the stylesheets alongside.
function copyStylesheets() {
  return {
    name: 'midnite-ui-copy-styles',
    closeBundle() {
      mkdirSync(r('dist'), { recursive: true });
      copyFileSync(r('src/styles/tokens.css'), r('dist/tokens.css'));
      copyFileSync(r('src/styles/code-highlight.css'), r('dist/code-highlight.css'));
    },
  };
}

// Rollup strips module-level directives when bundling, which would drop the
// `'use client'` boundary off the theme runtime — a Next.js (RSC) consumer would
// then treat ThemeProvider/useTheme as a server component and error. Re-emit the
// directive on any output chunk built from a source module that declared it.
function preserveUseClient() {
  const declaresUseClient = (id: string) => {
    const file = id.split('?')[0];
    if (!/\.[jt]sx?$/.test(file)) return false;
    try {
      return /^\s*['"]use client['"]\s*;?/.test(readFileSync(file, 'utf8'));
    } catch {
      return false;
    }
  };
  return {
    name: 'midnite-ui-preserve-use-client',
    renderChunk(code: string, chunk: { moduleIds: string[] }) {
      if (!chunk.moduleIds.some(declaresUseClient)) return null;
      // build.sourcemap is off, so no map to maintain.
      return { code: `'use client';\n${code}`, map: null };
    },
  };
}

// @midnite/ui is the one package built with Vite library mode rather than the
// repo's `tsc -b` convention: it bundles JSX/CSS/assets that tsc won't emit.
// Typechecking still runs via `tsc --noEmit` (the `typecheck` task); the `.d.ts`
// files are emitted by vite-plugin-dts. React stays external (a peer dependency).
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.spec.ts',
        'src/**/*.spec.tsx',
        // Stories + MDX docs are catalog inputs, never library build entries —
        // keep them out of declaration emit (Theme D).
        'src/**/*.stories.tsx',
        'src/**/*.mdx',
      ],
    }),
    copyStylesheets(),
    preserveUseClient(),
  ],
  build: {
    lib: {
      entry: {
        index: r('src/index.ts'),
        theme: r('src/theme.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external,
      // The `'use client'` directive is re-emitted by preserveUseClient(); silence
      // rollup's strip-and-warn so the build output stays clean.
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
});
