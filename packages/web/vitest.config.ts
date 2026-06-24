import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// Two projects under one runner so `vitest run` covers both layers:
//  - "unit"      — hand-written component/hook/lib specs under jsdom.
//  - "storybook" — every *.stories.tsx mounted in a real (headless chromium)
//                  browser via @storybook/addon-vitest; a story that throws on
//                  render fails here. Browser mode needs Playwright's chromium
//                  (`pnpm exec playwright install chromium`; CI installs it too).
export default defineConfig({
  test: {
    // Phase 10 F2 — v8 coverage. Run `vitest run --coverage` (or the moon
    // `web:test:coverage` task) to generate a coverage report. Thresholds are
    // modest to start; raise them as coverage matures. Only the `unit` project
    // contributes — browser tests (storybook) are excluded from coverage.
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
      exclude: ['**/*.stories.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/node_modules/**'],
      reporter: ['text', 'json-summary', 'lcov'],
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 20,
        statements: 20,
      },
    },
    projects: [
      {
        plugins: [react()],
        // Mirror tsconfig's `@/` alias so test imports match app imports.
        resolve: { alias: { '@': rootDir } },
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['{app,components,hooks,lib}/**/*.{test,spec}.{ts,tsx}'],
        },
      },
      {
        // The addon auto-applies the .storybook/preview decorators/globals to
        // every story (Storybook ≥10.3), so no extra setup file is needed.
        plugins: [storybookTest({ configDir: join(rootDir, '.storybook') })],
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
