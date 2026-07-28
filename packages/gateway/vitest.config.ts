import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest's 5s default is too tight for this suite once the whole moon graph
    // runs concurrently (which `moon ci --force` on `main` now does, uncached).
    // Nothing here is logically long-running — the tests that blew the default
    // were the ones doing real password hashing (deliberately expensive, CPU-bound,
    // so first to starve) and a >500-row hydrate parity check. They pass in
    // isolation and timed out only under contention, i.e. the clock was wrong,
    // not the code. Still bounded, so a genuinely hung test fails rather than hangs.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.e2e.ts',
        'src/main.ts',
        'src/db/migrations/**',
        '**/node_modules/**',
      ],
      reporter: ['text', 'json-summary', 'lcov'],
      thresholds: {
        lines: 40,
        functions: 35,
        branches: 35,
        statements: 40,
      },
    },
  },
});
