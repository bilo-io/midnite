import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
// `vitest/config`'s defineConfig types the `test` block alongside Vite's options.
import { defineConfig } from 'vitest/config';

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

// The design tokens are plain CSS custom properties — there is nothing to bundle,
// so ship them verbatim at dist/tokens.css (exposed as `@midnite/ui/styles`).
// Vite's lib build only emits the JS entries; this copies the stylesheet alongside.
function copyTokensCss() {
  return {
    name: 'midnite-ui-copy-tokens',
    closeBundle() {
      mkdirSync(r('dist'), { recursive: true });
      copyFileSync(r('src/styles/tokens.css'), r('dist/tokens.css'));
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
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    }),
    copyTokensCss(),
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
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
