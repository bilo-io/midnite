import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// Admin's components are React (client) components, so its unit + boundary specs
// run under jsdom with @testing-library/react (mirroring web's `unit` project and
// shell's runner). The boundary spec self-selects a node env via a file pragma.
export default defineConfig({
  plugins: [react()],
  // Mirror tsconfig's `@/` alias so test imports match app imports.
  resolve: { alias: { '@': rootDir } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['{app,components,contexts,lib,src}/**/*.{test,spec}.{ts,tsx}'],
  },
});
