import { defineConfig } from 'vitest/config';

// The desktop package is Electron main/preload code, unit-tested here in a plain
// node environment. Modules that import `electron` for types only (permissions.ts)
// test directly; a module that value-imports it (main/window-chrome.ts, for
// `ipcMain`) tests by faking the module with `vi.mock('electron', ...)`. Only code
// that needs the *running* Electron runtime (a live BrowserWindow, electron-updater
// talking to a feed) stays out of reach here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
