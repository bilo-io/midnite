import { defineConfig } from 'vitest/config';

// The desktop package is Electron main/preload code; only the electron-free
// modules (e.g. src/updates/*) are unit-tested here in a plain node environment.
// Anything importing `electron`/`electron-updater` can't run outside the runtime.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
