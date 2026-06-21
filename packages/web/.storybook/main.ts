import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  framework: { name: '@storybook/nextjs-vite', options: {} },
  stories: ['../components/**/*.stories.tsx'],
  addons: ['@storybook/addon-vitest'],
  staticDirs: ['../public'],
};

export default config;
