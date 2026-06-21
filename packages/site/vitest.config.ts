import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Mirror tsconfig's `@/` alias so test imports match app imports.
  resolve: { alias: { '@': rootDir } },
  // The package may live under `.git/worktrees/<branch>/` during the parallel-agent
  // workflow; vite's default fs deny (`**/.git/**`) would block test collection from
  // there. Clearing it lets `vitest run` work in a worktree as well as a normal
  // checkout (the runner only ever reads this package's own source).
  server: { fs: { deny: [] } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['{app,components,lib}/**/*.{test,spec}.{ts,tsx}'],
  },
});
