import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Component + helper tests run in jsdom (RTL). MDX rendering is not exercised
// here — the route registry is tested through its pure helpers (nav.ts), so the
// runner needs only the React plugin, not the MDX rollup pipeline.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
