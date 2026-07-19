import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// @midnite/shell's components are React (client) components, so its unit tests run
// under jsdom with @testing-library/react (mirroring packages/web's unit project),
// rather than @midnite/ui's Storybook browser-mode. Storybook stories for the
// shell/ui components land in Phase 73 Theme G.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
