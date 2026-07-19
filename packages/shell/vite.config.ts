import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));
const r = (p: string) => resolve(here, p);

// Externalize every declared dependency + peer dependency (and their subpaths)
// so the bundle ships only this package's own code — the canonical library build,
// mirroring @midnite/ui. `@midnite/ui` + `@midnite/shared` are deps, so they stay
// external (consumers already have them); `next`/`react`/`react-query` are peers.
const pkg = JSON.parse(readFileSync(r('package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};
const external = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
].map((name) => new RegExp(`^${name}(?:/.*)?$`));

// Rollup strips module-level directives when bundling, which would drop the
// `'use client'` boundary off the client components (AppFrame/LockScreen). Re-emit
// the directive on any output chunk built from a source module that declared it,
// so a Next.js (RSC) consumer gets a real client boundary. (Same fix as ui.)
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
    name: 'midnite-shell-preserve-use-client',
    renderChunk(code: string, chunk: { moduleIds: string[] }) {
      if (!chunk.moduleIds.some(declaresUseClient)) return null;
      return { code: `'use client';\n${code}`, map: null };
    },
  };
}

// @midnite/shell is built with Vite library mode (like @midnite/ui): it bundles
// JSX that tsc wouldn't emit. Typechecking still runs via `tsc --noEmit`; the
// `.d.ts` files come from vite-plugin-dts. shared/ui/react/next/react-query stay
// external.
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
      ],
    }),
    preserveUseClient(),
  ],
  build: {
    lib: {
      entry: {
        index: r('src/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external,
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
});
