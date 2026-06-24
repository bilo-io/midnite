import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
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
