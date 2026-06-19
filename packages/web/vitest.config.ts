import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Web unit tests run under jsdom with the React plugin so component/hook tests
// work. The `@/` alias mirrors tsconfig so test imports match app imports.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['{app,components,hooks,lib}/**/*.{test,spec}.{ts,tsx}'],
  },
});
