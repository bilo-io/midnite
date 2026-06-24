import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// A single project under `test.projects` (rather than top-level `plugins`) so the
// @vitejs/plugin-react plugin type (built for vite v6) is checked against the
// project-config type instead of vitest's bundled vite v7 `UserConfig` — the two
// vite type versions otherwise clash on `plugins` (TS2769). Mirrors web/ui.
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        // Mirror tsconfig's `@/` alias so test imports match app imports.
        resolve: { alias: { '@': rootDir } },
        // The package may live under `.git/worktrees/<branch>/` during the
        // parallel-agent workflow; vite's default fs deny (`**/.git/**`) would
        // block test collection from there. Clearing it lets `vitest run` work in
        // a worktree as well as a normal checkout (the runner only ever reads this
        // package's own source).
        server: { fs: { deny: [] } },
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['{app,components,lib}/**/*.{test,spec}.{ts,tsx}'],
        },
      },
    ],
  },
});
