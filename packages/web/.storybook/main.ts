import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/nextjs-vite';

// `@midnite/shared` ships CommonJS (tsc `dist/index.js` → `__exportStar`). rollup's
// commonjs pass in the production `storybook build` can't statically resolve some
// named imports through that re-export barrel (a re-exported module that itself
// `require()`s a sibling), failing with "X is not exported by ../shared/dist/index.js".
// Point the build at shared's TS *source* so Vite compiles it as ESM with real,
// statically-analyzable named exports. Storybook-scoped — the app's Next build and
// the vitest browser tests are unaffected.
const sharedSrc = fileURLToPath(new URL('../../shared/src/index.ts', import.meta.url));

const config: StorybookConfig = {
  framework: { name: '@storybook/nextjs-vite', options: {} },
  stories: ['../components/**/*.stories.tsx'],
  addons: ['@storybook/addon-vitest', '@storybook/addon-a11y'],
  staticDirs: ['../public'],
  viteFinal: async (viteConfig) => {
    viteConfig.resolve ??= {};
    viteConfig.resolve.alias = {
      ...viteConfig.resolve.alias,
      '@midnite/shared': sharedSrc,
    };
    return viteConfig;
  },
};

export default config;
