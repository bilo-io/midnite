import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// Two projects under one runner so `vitest run` covers both layers (Phase 25
// Theme D, mirroring web's Phase 10 C1 setup):
//  - "unit"      — the node-env specs (boundary/tokens/theme-script/cn). These
//                  don't touch the DOM, so plain node is the right environment.
//  - "storybook" — every *.stories.tsx mounted in a real (headless chromium)
//                  browser via @storybook/addon-vitest; a story that throws on
//                  render fails here. Browser mode needs Playwright's chromium
//                  (`pnpm exec playwright install chromium`; CI installs it too).
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
        },
      },
      {
        // The addon auto-applies the .storybook/preview decorators/globals to
        // every story (Storybook ≥10.3), so no extra setup file is needed.
        plugins: [storybookTest({ configDir: join(rootDir, '.storybook') })],
        // Eagerly pre-bundle the heavy third-party deps the stories pull in
        // (Phase 73 G). On a COLD run (no `node_modules/.vite` cache) the browser
        // optimizer discovers deps lazily as the story files load in parallel; a
        // late discovery triggers a full-page reload that tears down the running
        // suite ("Vitest failed to find the current suite"). Forcing one up-front
        // optimize makes the first run green like the (warm-cache) re-run. (ui is a
        // leaf, so there are no `@midnite/*` deps to include here.)
        optimizeDeps: {
          include: ['react', 'react-dom', 'react/jsx-dev-runtime', 'lucide-react', 'react-select'],
        },
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
